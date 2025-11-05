import Fastify from 'fastify';
import 'dotenv/config';
import { query } from './db';
import minioClient, { setupMinIO } from './minioClient';
import { Client as MinioClient } from 'minio';
import { videoQueue } from './queue';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import crypto from 'crypto';

const server = Fastify({ logger: true });

// CORS: allow the frontend origin to call our API
server.register(cors, {
  origin: 'https://streamharbor.me',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type'],
});

// Accept any content-type as a stream for raw uploads
// For uploads from the browser we'll accept the body as a buffer (note: this buffers file in memory).
// This is simpler and avoids adding multipart parsing dependencies. For large files you may want
// to implement a streaming parser or upload directly via presigned URLs.
server.addContentTypeParser('*', { parseAs: 'buffer' }, function (req, body, done) {
  done(null, body);
});

// Ensure MinIO buckets exist before handling requests
setupMinIO().catch((err) => {
  console.error('Failed to set up MinIO:', err);
  process.exit(1);
});

// Register multipart plugin for streaming uploads
server.register(multipart, {
  limits: {
    // Increase max upload size to support long videos.
    // Can be overridden with env UPLOAD_MAX_BYTES.
    fileSize: parseInt(process.env.UPLOAD_MAX_BYTES || String(50 * 1024 * 1024 * 1024), 10), // default 50 GB
  },
});

// Helper: convert an internal MinIO URL to a public URL reachable by the browser.
const getPublicUrl = (url: string | null) => {
  if (!url) return null;
  const useSSL = process.env.MINIO_USE_SSL === 'true';
  const publicBase = process.env.MINIO_PUBLIC_URL || `https://minio.streamharbor.me`;
  const internalHost = `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
  try {
    const parsed = new URL(url);
    if (parsed.host === internalHost || parsed.hostname === process.env.MINIO_ENDPOINT) {
      const out = new URL(publicBase);
      out.pathname = parsed.pathname;
      out.search = parsed.search;
      return out.toString();
    }
    return url;
  } catch (e) {
    // Fallback string replace for odd cases
    return url.replace(`http://${internalHost}`, publicBase).replace(`https://${internalHost}`, publicBase);
  }
};

// Simple health check
server.get('/', async () => ({ status: 'ok', message: 'StreamHarbor backend is running' }));

// Test queue route
server.get('/test-queue', async (request, reply) => {
  try {
    const job = await videoQueue.add('test-job', { message: 'test', timestamp: new Date().toISOString() });
    return { status: 'ok', jobId: job.id };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to add job to queue' });
  }
});

// Get a pre-signed URL for uploading a file to MinIO
server.get('/api/upload-url', async (request, reply) => {
  const { filename } = request.query as { filename?: string };
  if (!filename) {
    reply.status(400).send({ error: 'filename query param required' });
    return;
  }

  try {
    const ext = filename.split('.').pop() || 'bin';
    const id = crypto.randomBytes(12).toString('hex');
    const storagePath = `${id}.${ext}`;
    const bucket = 'raw-uploads';

    // Generate presigned URL using the existing minioClient (already configured for Docker network)
    const uploadUrl = await minioClient.presignedPutObject(bucket, storagePath, 60 * 60); // 1 hour

    // Replace internal MinIO hostname with public URL so browser can reach it
    const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
    const internalHost = `${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`;
    const publicUrl = uploadUrl.replace(`http://${internalHost}`, publicBase).replace(`https://${internalHost}`, publicBase);

    return { uploadUrl: publicUrl, storagePath };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to generate upload URL' });
  }
});

// Create a new video record and queue processing
server.post('/api/videos', async (request, reply) => {
  const body = request.body as {
    title: string;
    description?: string;
    storagePath: string;
    originalFilename?: string;
    thumbnailPath?: string;
  };

  if (!body || !body.title || !body.storagePath) {
    reply.status(400).send({ error: 'title and storagePath required' });
    return;
  }

  try {
    // If thumbnail path is provided, generate the full URL
    let thumbnailUrl = null;
    if (body.thumbnailPath) {
      const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
      thumbnailUrl = `${publicBase}/processed/${body.thumbnailPath}`;
    }

    const result = await query(
      `INSERT INTO videos (title, description, original_filename, storage_path, status, thumbnail_url)
       VALUES ($1, $2, $3, $4, 'PROCESSING', $5) RETURNING id`,
      [body.title, body.description || null, body.originalFilename || null, body.storagePath, thumbnailUrl]
    );

    const videoId = result.rows[0].id;

    await videoQueue.add('process-video', { videoId, storagePath: body.storagePath, customThumbnail: !!thumbnailUrl });

    return { status: 'ok', videoId };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to create video' });
  }
});

// Upload subtitles for a specific video (multipart: multiple 'file' fields and matching 'lang' or 'label')
server.post('/api/videos/:id/subtitles', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    // Ensure video exists
    const vr = await query('SELECT id FROM videos WHERE id = $1', [id]);
    if (vr.rows.length === 0) {
      reply.status(404).send({ error: 'Video not found' });
      return;
    }

    const parts = (request as any).parts();
    const uploaded: any[] = [];
    const langs: string[] = [];
    const labels: string[] = [];

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'file') {
        const filename = part.filename || `subtitle-${Date.now()}.vtt`;
        const ext = (filename.split('.').pop() || 'vtt').toLowerCase();
        const objName = `${id}/subtitles/${crypto.randomBytes(8).toString('hex')}.${ext}`;
        await minioClient.putObject('processed-media', objName, part.file, { 'Content-Type': 'text/vtt' });
        uploaded.push(objName);
      } else if (part.type === 'field' && (part.fieldname === 'lang' || part.fieldname === 'langs[]')) {
        langs.push(String(part.value));
      } else if (part.type === 'field' && (part.fieldname === 'label' || part.fieldname === 'labels[]')) {
        labels.push(String(part.value));
      }
    }

    // Build records and insert
    const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
    const rows: any[] = [];
    for (let i = 0; i < uploaded.length; i++) {
      const storagePath = uploaded[i];
      const language = langs[i] || labels[i] || null;
      const label = labels[i] || langs[i] || 'Subtitle';
      const url = `${publicBase}/processed-media/${encodeURIComponent(storagePath)}`;
      await query(
        'INSERT INTO subtitles (video_id, language, label, storage_path, url) VALUES ($1, $2, $3, $4, $5)',
        [id, language, label, storagePath, url]
      );
      rows.push({ video_id: id, language, label, storagePath, url });
    }

    return { status: 'ok', count: rows.length, subtitles: rows };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to upload subtitles' });
  }
});

// Get subtitles for a video
server.get('/api/videos/:id/subtitles', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const res = await query('SELECT id, video_id, language, label, storage_path, url, created_at FROM subtitles WHERE video_id = $1 ORDER BY id ASC', [id]);
    return res.rows;
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch subtitles' });
  }
});

// Upload file via backend (streaming multipart) — avoids CORS issues and doesn't buffer the whole file
// Clients should POST multipart/form-data with field name 'file'.
server.post('/api/upload-file', async (request, reply) => {
  try {
    const file = await (request as any).file(); // file.file is a Readable stream
    if (!file) {
      reply.status(400).send({ error: 'file field is required' });
      return;
    }

    const filename = file.filename || `upload-${Date.now()}`;
    const ext = filename.split('.').pop() || 'bin';
    const id = crypto.randomBytes(12).toString('hex');
    const storagePath = `${id}.${ext}`;
    const bucket = 'raw-uploads';

    // Stream to MinIO - use putObject without size parameter to let MinIO handle chunked transfer
    await minioClient.putObject(
      bucket,
      storagePath,
      file.file,
      { 'Content-Type': file.mimetype || 'application/octet-stream' }
    );

    // If multipart truncated due to limits, reject and clean up
    if ((file as any).truncated) {
      try {
        await new Promise<void>((resolve, reject) => {
          (minioClient as any).removeObject(bucket, storagePath, (err: any) => (err ? reject(err) : resolve()));
        });
      } catch (_) {}
      reply.status(413).send({ error: 'File too large (multipart limit exceeded)' });
      return;
    }

    return { storagePath };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to upload file' });
  }
});

// Upload thumbnail via backend
server.post('/api/upload-thumbnail', async (request, reply) => {
  try {
    const file = await (request as any).file();
    if (!file) {
      reply.status(400).send({ error: 'file field is required' });
      return;
    }

    const filename = file.filename || `thumbnail-${Date.now()}`;
    const ext = filename.split('.').pop() || 'jpg';
    const id = crypto.randomBytes(12).toString('hex');
    const storagePath = `thumbnails/${id}.${ext}`;
    const bucket = 'processed';

    // Upload thumbnail to processed bucket
    await minioClient.putObject(bucket, storagePath, file.file, file.file.truncated ? -1 : file.file.bytesRead || -1);

    // Get public URL
    const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
    const thumbnailUrl = `${publicBase}/processed/${storagePath}`;

    return { storagePath, thumbnailUrl };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to upload thumbnail' });
  }
});

// Get published videos
server.get('/api/videos', async (request, reply) => {
  try {
    const { q } = request.query as { q?: string };
    const params: any[] = [];
    let sql = `
      SELECT id, title, description, thumbnail_url, status, created_at, storage_path, processing_error, processing_progress 
      FROM videos 
      WHERE 1=1
    `;
    
    if (q) {
      sql += ` AND (
        title ILIKE $1 
        OR description ILIKE $1
      )`;
      params.push(`%${q}%`);
    }
    
    sql += " ORDER BY created_at DESC";
    
    const result = await query(sql, params);
    const rows = result.rows.map((r: any) => {
      const thumbnail = getPublicUrl(r.thumbnail_url);
      // Construct a raw URL for the original uploaded file so the frontend can fallback to it
      const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
      const rawUrl = r.storage_path ? `${publicBase}/raw-uploads/${encodeURIComponent(r.storage_path)}` : null;
      return { ...r, thumbnail_url: thumbnail, raw_url: rawUrl };
    });
    return rows;
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch videos' });
  }
});

// Get single video details
server.get('/api/videos/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
  const result = await query('SELECT * FROM videos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      reply.status(404).send({ error: 'Video not found' });
      return;
    }
    const row = result.rows[0];
    row.thumbnail_url = getPublicUrl(row.thumbnail_url);
    row.hls_playlist_url = getPublicUrl(row.hls_playlist_url);
    // expose a raw URL for the original uploaded file
    const publicBase = process.env.MINIO_PUBLIC_URL || `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://localhost:${process.env.MINIO_PORT}`;
    row.raw_url = row.storage_path ? `${publicBase}/raw-uploads/${encodeURIComponent(row.storage_path)}` : null;
    return row;
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to fetch video' });
  }
});

// Admin: delete a video and its storage objects
server.delete('/api/videos/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  try {
    const result = await query('SELECT * FROM videos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      reply.status(404).send({ error: 'Video not found' });
      return;
    }
    const row = result.rows[0];
    // Remove raw object if present
    if (row.storage_path) {
      try {
        await new Promise<void>((resolve, reject) => {
          (minioClient as any).removeObject('raw-uploads', row.storage_path, (err: any) => {
            if (err) return reject(err);
            resolve();
          });
        });
      } catch (err) {
        request.log.warn('Failed to remove raw object from MinIO: ' + String(err));
      }
    }

    // Remove processed-media/<id>/* objects
    try {
      const prefix = `${id}/`;
      const objects: string[] = [];
      const stream = (minioClient as any).listObjectsV2('processed-media', prefix, true);
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (obj: any) => {
          if (obj && obj.name) objects.push(obj.name);
        });
        stream.on('end', () => resolve());
        stream.on('error', (e: any) => reject(e));
      });

      for (const objName of objects) {
        try {
          await new Promise<void>((resolve, reject) => {
            (minioClient as any).removeObject('processed-media', objName, (err: any) => {
              if (err) return reject(err);
              resolve();
            });
          });
        } catch (err) {
          request.log.warn('Failed to remove processed object ' + objName + ': ' + String(err));
        }
      }
    } catch (err) {
      request.log.warn('Failed to list/remove processed objects: ' + String(err));
    }

    // Delete DB row
    await query('DELETE FROM videos WHERE id = $1', [id]);

    return { status: 'ok' };
  } catch (err) {
    request.log.error(err);
    reply.status(500).send({ error: 'Failed to delete video' });
  }
});

// Start server
const start = async () => {
  try {
    const PORT = parseInt(process.env.PORT || '8080', 10);
    await server.listen({ port: PORT, host: '0.0.0.0' });
    server.log.info(`Server listening on ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();