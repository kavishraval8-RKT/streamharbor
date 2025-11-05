'use client'; // This MUST be a Client Component to handle user interaction

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // All hooks must be called before any conditional returns
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('idle'); // idle | uploading | processing | complete | error
  const [message, setMessage] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [thumbPct, setThumbPct] = useState(0);
  const [processPct, setProcessPct] = useState<number | null>(null);
  const [subtitles, setSubtitles] = useState<Array<{ file: File | null; lang: string }>>([
    { file: null, lang: '' }
  ]);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Show nothing while checking auth or if not admin
  if (authLoading || user?.role !== 'admin') {
    return (
      <main className="min-h-screen bg-[#141414] pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const thumbFile = e.target.files[0];
      setThumbnail(thumbFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(thumbFile);
    }
  };

  const handleSubtitleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const newSubs = [...subtitles];
    newSubs[index] = { ...newSubs[index], file: e.target.files?.[0] || null };
    setSubtitles(newSubs);
  };

  const handleSubtitleLangChange = (index: number, lang: string) => {
    const newSubs = [...subtitles];
    newSubs[index] = { ...newSubs[index], lang };
    setSubtitles(newSubs);
  };

  const addSubtitleRow = () => setSubtitles([...subtitles, { file: null, lang: '' }]);
  const removeSubtitleRow = (index: number) => setSubtitles(subtitles.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setMessage('Please select a file and provide a title.');
      return;
    }

    setStatus('uploading');
    setMessage('Uploading file to backend...');
    setUploadPct(0);
    setThumbPct(0);

    try {
      // Upload via backend streaming (no size cap with updated backend)
      const fd = new FormData();
      fd.append('file', file, file.name);

      const storagePath = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://api.streamharbor.me/api/upload-file');
        // Note: withCredentials removed - upload endpoint doesn't need authentication
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
        };
        xhr.onload = () => {
          try {
            const ok = xhr.status >= 200 && xhr.status < 300;
            const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            if (!ok) return reject(new Error(json.error || `Upload failed (${xhr.status})`));
            resolve(json.storagePath);
          } catch (err) {
            reject(err);
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(fd);
      });
      setMessage('File uploaded. Finalizing with backend...');

      // 2. Upload thumbnail if provided
      let thumbnailPath = null;
      // helper for posting FormData (thumbnail) with progress
      const postFormWithProgress = (endpoint: string, data: FormData, onProgress?: (pct: number) => void) =>
        new Promise<any>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', endpoint);
          // Note: withCredentials removed - upload endpoint doesn't need authentication
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && onProgress) {
              const pct = Math.round((evt.loaded / evt.total) * 100);
              onProgress(pct);
            }
          };
          xhr.onload = () => {
            try {
              const ok = xhr.status >= 200 && xhr.status < 300;
              const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
              if (!ok) return reject(new Error(json.error || `Upload failed (${xhr.status})`));
              resolve(json);
            } catch (err) {
              reject(err);
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(data);
        });

      if (thumbnail) {
        setMessage('Uploading thumbnail...');
        const thumbFd = new FormData();
        thumbFd.append('file', thumbnail, thumbnail.name);

        const thumbData = await postFormWithProgress('https://api.streamharbor.me/api/upload-thumbnail', thumbFd, setThumbPct).catch(() => null);
        if (thumbData) thumbnailPath = thumbData.storagePath;
      }

      // 3. Tell our backend to create the video record and queue the job
      const res3 = await fetch('https://api.streamharbor.me/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          storagePath,
          originalFilename: file.name,
          thumbnailPath,
        }),
      });
      if (!res3.ok) throw new Error('Failed to finalize upload');

      const json = await res3.json();
      const videoId = json.videoId;

      // 3b. Upload subtitles if provided
      const validSubs = subtitles.filter(s => s.file && s.lang.trim().length > 0) as Array<{ file: File; lang: string }>;
      if (validSubs.length > 0) {
        setMessage('Uploading subtitles...');
        const subFd = new FormData();
        validSubs.forEach(s => {
          subFd.append('file', s.file, s.file.name);
          subFd.append('lang', s.lang.trim());
        });
        try {
          await fetch(`https://api.streamharbor.me/api/videos/${videoId}/subtitles`, {
            method: 'POST',
            body: subFd,
          });
        } catch (_) {
          // non-fatal
        }
      }

      // Now poll the video status and show processing feedback
      setStatus('processing');
      setMessage('Video queued for processing — waiting for worker...');

      let mounted = true;
      const poll = async () => {
        try {
          const r = await fetch(`https://api.streamharbor.me/api/videos/${videoId}`);
          if (!r.ok) return;
          const obj = await r.json();
          if (!mounted) return;
          if (obj.status === 'PUBLISHED') {
            setStatus('complete');
            setMessage('Processing complete — your video is ready.');
            // reset form
            setFile(null);
            setThumbnail(null);
            setThumbnailPreview(null);
            setTitle('');
            setDescription('');
            setProcessPct(100);
            mounted = false;
          } else if (obj.status === 'ERROR') {
            setStatus('error');
            setMessage(obj.processing_error || 'Processing failed');
            mounted = false;
          } else {
            setMessage('Processing...');
            if (typeof obj.processing_progress === 'number') {
              setProcessPct(obj.processing_progress);
            }
          }
        } catch (e) {
          // ignore transient
        }
      };

      const interval = setInterval(() => poll(), 3000);
      // immediate
      await poll();
      // stop polling when unmounted or finished
      const stopWhenDone = setInterval(async () => {
        if (!mounted) {
          clearInterval(interval);
          clearInterval(stopWhenDone);
        }
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setMessage(`Upload failed: ${err.message}`);
    }
  };

  const isLoading = status === 'uploading' || status === 'processing';

  return (
    <main className="min-h-screen bg-[#141414] pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-6">Upload a New Video</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 border border-gray-700 p-6 rounded-lg">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none p-3 disabled:opacity-50 placeholder-gray-500"
            placeholder="Enter video title"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none p-3 disabled:opacity-50 placeholder-gray-500"
            placeholder="Enter video description"
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-300 mb-2">
            Video File
          </label>
          <input
            type="file"
            id="file"
            onChange={handleFileChange}
            disabled={isLoading}
            className="mt-1 block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
            accept="video/*"
            required
          />
        </div>

        <div>
          <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-300 mb-2">
            Custom Thumbnail (Optional)
          </label>
          <input
            type="file"
            id="thumbnail"
            onChange={handleThumbnailChange}
            disabled={isLoading}
            className="mt-1 block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 disabled:opacity-50"
            accept="image/*"
          />
          {thumbnailPreview && (
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-2">Preview:</p>
              <img 
                src={thumbnailPreview} 
                alt="Thumbnail preview" 
                className="max-w-xs rounded-lg border border-gray-600"
              />
            </div>
          )}
        </div>

        {/* Subtitles upload section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">Subtitles (WebVTT .vtt)</label>
            <button type="button" onClick={addSubtitleRow} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">+ Add subtitle</button>
          </div>
          <div className="space-y-3">
            {subtitles.map((row, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".vtt"
                  onChange={(e) => handleSubtitleFileChange(idx, e)}
                  disabled={isLoading}
                  className="flex-1 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-600 file:text-white hover:file:bg-gray-700 disabled:opacity-50"
                />
                <input
                  type="text"
                  placeholder="Language (e.g., English)"
                  value={row.lang}
                  onChange={(e) => handleSubtitleLangChange(idx, e.target.value)}
                  disabled={isLoading}
                  className="w-48 rounded-md border border-gray-600 bg-gray-900 text-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                />
                {subtitles.length > 1 && (
                  <button type="button" onClick={() => removeSubtitleRow(idx)} className="text-xs text-red-300 hover:text-red-200">Remove</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress bars during upload */}
        {isLoading && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Video upload</span>
                <span>{uploadPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded">
                <div className="h-2 bg-blue-600 rounded" style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
            {thumbnail && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Thumbnail upload</span>
                  <span>{thumbPct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded">
                  <div className="h-2 bg-green-600 rounded" style={{ width: `${thumbPct}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? `${status}...` : 'Upload Video'}
        </button>

        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-400' : status === 'complete' ? 'text-green-400' : 'text-gray-300'}`}>
            {message}
          </p>
        )}

        {status === 'processing' && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Processing</span>
              <span>{processPct ?? 0}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded">
              <div className="h-2 bg-purple-600 rounded transition-all" style={{ width: `${processPct ?? 0}%` }} />
            </div>
          </div>
        )}
      </form>
      </div>
    </main>
  );
}