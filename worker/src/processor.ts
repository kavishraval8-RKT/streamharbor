import { Worker, Job } from 'bullmq';
import { Client as MinioClient } from 'minio';
import { Pool } from 'pg';
import { tmpdir } from 'os';
import { join } from 'path';
import { promises as fsPromises, createWriteStream } from 'fs';
import { spawn } from 'child_process';
import 'dotenv/config';

const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

const RAW_BUCKET = 'raw-uploads';
const PROCESSED_BUCKET = 'processed-media';

async function downloadFromMinio(objectName: string, destPath: string) {
  return new Promise<void>((resolve, reject) => {
    minioClient.getObject(RAW_BUCKET, objectName, (err, stream) => {
      if (err) return reject(err);
      const out = createWriteStream(destPath);
      stream.pipe(out);
      out.on('finish', () => resolve());
      out.on('error', reject);
      stream.on('error', reject);
    });
  });
}

async function uploadFileToMinio(localPath: string, destKey: string) {
  return new Promise<void>((resolve, reject) => {
    minioClient.fPutObject(PROCESSED_BUCKET, destKey, localPath, {}, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function runFfmpeg(args: string[], cwd?: string, onProgress?: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    
    let duration = 0;
    let stderr = '';
    
    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
      
      // Parse duration from FFmpeg output
      const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}.\d{2})/);
      if (durationMatch && duration === 0) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseFloat(durationMatch[3]);
        duration = hours * 3600 + minutes * 60 + seconds;
      }
      
      // Parse current time for progress
      const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}.\d{2})/);
      if (timeMatch && duration > 0 && onProgress) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseFloat(timeMatch[3]);
        const currentTime = hours * 3600 + minutes * 60 + seconds;
        const percent = Math.min(100, Math.round((currentTime / duration) * 100));
        onProgress(percent);
      }
    });
    
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function processVideo(videoId: number, storagePath: string): Promise<void> {
  const workDir = await fsPromises.mkdtemp(join(tmpdir(), `streamharbor-${videoId}-`));
  const inputPath = join(workDir, 'input');

  try {
    await downloadFromMinio(storagePath, inputPath);
    const outDir = join(workDir, 'hls');
    await fsPromises.mkdir(outDir);

    // Generate a thumbnail (single JPEG frame) for UI previews
  const thumbPath = join(outDir, 'thumb.jpg');
  // Seek first (faster) then capture one frame; set quality and force single frame output
  const thumbArgs = ['-y', '-ss', '00:00:01', '-i', inputPath, '-frames:v', '1', '-q:v', '2', thumbPath];
    try {
      await runFfmpeg(thumbArgs);
    } catch (thumbErr) {
      // non-fatal: log and continue (thumbnail is optional)
      console.warn('Thumbnail generation failed for', videoId, thumbErr);
    }

  // Produce multi-bitrate HLS renditions (1080p, 720p, 480p).
    // OPTIMIZED: Using faster preset and reduced renditions for large files
    // For very large videos (>2GB), use single quality for faster processing
    const renditions = [
      { name: '720p', width: 1280, height: 720, bitrate: '2500k', maxrate: '2800k', bufsize: '3500k', audio: '128k' },
      // Commented out 480p to speed up processing for large files
      // { name: '480p', width: 854, height: 480, bitrate: '1200k', maxrate: '1400k', bufsize: '1800k', audio: '96k' },
    ];

    // Use software encoding with ultrafast preset for large videos (compatible and reliable)
    const videoCodec = 'libx264';
    const extraArgs = ['-preset', 'ultrafast', '-crf', '23'];

    // Helper: update DB progress, throttled
    let lastSent = -1;
    const updateProgress = async (percentOverall: number) => {
      const p = Math.max(0, Math.min(100, Math.round(percentOverall)));
      if (p === lastSent) return;
      lastSent = p;
      try {
        await pool.query('UPDATE videos SET processing_progress = $1 WHERE id = $2', [p, videoId]);
      } catch (_) {}
    };

    for (let i = 0; i < renditions.length; i++) {
      const r = renditions[i];
      const outR = join(outDir, r.name);
      await fsPromises.mkdir(outR, { recursive: true });
      const segmentPattern = join(outR, 'seg_%03d.ts');

      const argsR = [
        '-y',
        '-i', inputPath,
        '-c:v', videoCodec,
        ...extraArgs,
        '-b:v', r.bitrate,
        '-maxrate', r.maxrate,
        '-bufsize', r.bufsize,
        '-vf', `scale=-2:${r.height}`,
        '-c:a', 'aac',
        '-b:a', r.audio,
        '-ac', '2',
        '-hls_time', '6', // Increased from 4 to 6 seconds for faster processing
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segmentPattern,
        '-hls_flags', 'independent_segments', // Optimize for streaming
        join(outR, 'index.m3u8'),
      ];

      console.log(`🎬 Processing ${r.name} rendition...`);
      const base = (100 / renditions.length) * i;
      await runFfmpeg(argsR, undefined, (percent) => {
        const overall = base + percent / renditions.length;
        updateProgress(overall).catch(() => {});
      });
      await updateProgress(base + 100 / renditions.length);
    }

    // Upload all generated files (segment files + variant playlists)
    for (const r of renditions) {
      const outR = join(outDir, r.name);
      const files = await fsPromises.readdir(outR);
      for (const f of files) {
        const local = join(outR, f);
        const destKey = `${videoId}/${r.name}/${f}`;
        await uploadFileToMinio(local, destKey);
      }
    }

    // Upload thumbnail if present
    try {
      const thumbStat = await fsPromises.stat(thumbPath).catch(() => null);
      if (thumbStat) {
        await uploadFileToMinio(thumbPath, `${videoId}/thumb.jpg`);
      }
    } catch (e) {
      console.warn('Failed to upload thumbnail for', videoId, e);
    }

    // Build and upload master playlist
    const masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];
    for (const r of renditions) {
      // Estimate BANDWIDTH roughly (video bitrate + audio)
      const bandwidth = parseInt(r.bitrate.replace('k', ''), 10) * 1000 + parseInt(r.audio.replace('k', ''), 10) * 1000;
      masterLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${r.width}x${r.height}`);
      masterLines.push(`${r.name}/index.m3u8`);
    }
    const masterContent = masterLines.join('\n') + '\n';
    const masterPath = join(outDir, 'master.m3u8');
    await fsPromises.writeFile(masterPath, masterContent, 'utf8');
    await uploadFileToMinio(masterPath, `${videoId}/master.m3u8`);

  const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
    const hlsUrl = `${publicBase}/${PROCESSED_BUCKET}/${videoId}/master.m3u8`;

    // Check if video already has a custom thumbnail
    const existingVideo = await pool.query(`SELECT thumbnail_url FROM videos WHERE id = $1`, [videoId]);
    const hasCustomThumbnail = existingVideo.rows[0]?.thumbnail_url;

    // Only update thumbnail_url if there isn't a custom one already
    if (hasCustomThumbnail) {
      await pool.query(
        `UPDATE videos SET status = 'PUBLISHED', processing_progress = 100, hls_playlist_url = $1, updated_at = NOW() WHERE id = $2`,
        [hlsUrl, videoId]
      );
      console.log(`✅ Video ${videoId} processed successfully (keeping custom thumbnail), hls: ${hlsUrl}`);
    } else {
      const thumbUrl = `${publicBase}/${PROCESSED_BUCKET}/${videoId}/thumb.jpg`;
      await pool.query(
        `UPDATE videos SET status = 'PUBLISHED', processing_progress = 100, hls_playlist_url = $1, thumbnail_url = $2, updated_at = NOW() WHERE id = $3`,
        [hlsUrl, thumbUrl, videoId]
      );
      console.log(`✅ Video ${videoId} processed successfully, hls: ${hlsUrl}`);
    }
  } catch (err) {
    console.error(`❌ Error processing video ${videoId}:`, err);
    await pool.query(
      `UPDATE videos SET status = 'ERROR', processing_error = $1, updated_at = NOW() WHERE id = $2`,
      [err instanceof Error ? err.message : 'Unknown error', videoId]
    );
    throw err;
  } finally {
    try {
      await fsPromises.rm(workDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

const connection = {
  host: process.env.REDIS_HOST || 'queue',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

console.log('Worker connecting to Redis...');

const worker = new Worker('video-processing', async (job: Job) => {
  console.log(`[WORKER] Processing job ${job.id}, video ${job.data.videoId}`);
  const { videoId, storagePath, customThumbnail } = job.data;
  if (!videoId || !storagePath) throw new Error('Missing videoId or storagePath in job data');
  if (customThumbnail) {
    console.log(`[WORKER] Video ${videoId} has custom thumbnail, will preserve it`);
  }
  await processVideo(videoId, storagePath);
  return { status: 'complete', videoId };
}, { connection });

worker.on('completed', (job: Job) => {
  console.log(`[WORKER] Completed job ${job.id}`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[WORKER] Failed job ${job?.id}:`, err);
});

console.log('✅ Worker is running and waiting for jobs...');