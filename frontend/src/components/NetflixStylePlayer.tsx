"use client";
import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Hls from 'hls.js';

interface Props {
  src: string;
  poster?: string;
  title?: string;
  videoId?: number | string; // used to fetch external subtitle tracks
}

export default function NetflixStylePlayer({ src, poster, title, videoId }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [textTracks, setTextTracks] = useState<any[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1);
  const [selectedTextTrack, setSelectedTextTrack] = useState<number>(-1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls: Hls | null = null;
    if (src.endsWith('.m3u8') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src;
    }
    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const update = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    video.addEventListener('timeupdate', update);
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Load audio and subtitle tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const loadTracks = () => {
      // Get audio tracks
      if ((video as any).audioTracks) {
        const audioList = Array.from((video as any).audioTracks);
        setAudioTracks(audioList);
        const selectedIndex = audioList.findIndex((track: any) => track.enabled);
        setSelectedAudioTrack(selectedIndex);
      }
      
      // Get text tracks (subtitles)
      if (video.textTracks) {
        const textList = Array.from(video.textTracks);
        setTextTracks(textList);
        const selectedIndex = textList.findIndex((track: any) => track.mode === 'showing');
        setSelectedTextTrack(selectedIndex);
      }
    };
    
    video.addEventListener('loadedmetadata', loadTracks);
    // Also try immediately in case metadata already loaded
    if (video.readyState >= 1) loadTracks();
    
    return () => {
      video.removeEventListener('loadedmetadata', loadTracks);
    };
  }, []);

  // Load external subtitle tracks via backend for this video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoId) return;
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`https://api.streamharbor.me/api/videos/${videoId}/subtitles`);
        if (!res.ok) return;
        const subs: Array<{ label?: string; url: string; language?: string }> = await res.json();
        if (aborted) return;
        // Remove any existing dynamically-added tracks first
        const existingTracks = Array.from(video.querySelectorAll('track[data-dynamic="true"]'));
        existingTracks.forEach(t => t.remove());
        subs.forEach(s => {
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = s.label || s.language || 'Subtitle';
          track.srclang = (s.language || '').toString().slice(0,2).toLowerCase() || 'en';
          track.src = s.url;
          track.setAttribute('data-dynamic', 'true');
          video.appendChild(track);
        });
      } catch (_) {}
    })();
    return () => { aborted = true; };
  }, [videoId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      setIsHovering(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
          setIsHovering(false);
        }
      }, 3000);
    };
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => setIsHovering(false));
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', () => setIsHovering(false));
      };
    }
  }, [isPlaying]);

  // Auto-focus container on mount to ensure keyboard events work
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.focus();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      // Prevent default for all our shortcuts
      const ourKeys = [' ', 'k', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'f', 'm', 'Escape'];
      if (ourKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }

      switch(e.key) {
        case ' ':
        case 'k':
          if (video.paused) {
            video.play();
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
          break;
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'ArrowRight':
          video.currentTime = Math.min(duration, video.currentTime + 10);
          break;
        case 'f':
          if (!document.fullscreenElement) {
            video.requestFullscreen();
            setIsFullscreen(true);
          } else {
            document.exitFullscreen();
            setIsFullscreen(false);
          }
          break;
        case 'm':
          if (isMuted) {
            video.volume = volume || 0.5;
            setVolume(volume || 0.5);
            setIsMuted(false);
          } else {
            video.volume = 0;
            setIsMuted(true);
          }
          break;
        case 'ArrowUp':
          const newVolumeUp = Math.min(1, volume + 0.1);
          video.volume = newVolumeUp;
          setVolume(newVolumeUp);
          setIsMuted(false);
          break;
        case 'ArrowDown':
          const newVolumeDown = Math.max(0, volume - 0.1);
          video.volume = newVolumeDown;
          setVolume(newVolumeDown);
          setIsMuted(newVolumeDown === 0);
          break;
        case 'Escape':
          if (isFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
          } else {
            router.back();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [volume, isFullscreen, isMuted, duration, router]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  function handleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    if (!document.fullscreenElement) {
      video.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const video = videoRef.current;
    const vol = Number(e.target.value);
    if (!video) return;
    video.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  }

  function changePlaybackRate(rate: number) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }

  function skip(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  }

  function formatTime(seconds: number) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function selectAudioTrack(index: number) {
    const video = videoRef.current;
    if (!video || !(video as any).audioTracks) return;
    
    // Disable all audio tracks
    const tracks = (video as any).audioTracks;
    for (let i = 0; i < tracks.length; i++) {
      tracks[i].enabled = false;
    }
    
    // Enable the selected track
    if (index >= 0 && index < tracks.length) {
      tracks[index].enabled = true;
      setSelectedAudioTrack(index);
    }
  }

  function selectTextTrack(index: number) {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;
    
    // Disable all text tracks
    for (let i = 0; i < video.textTracks.length; i++) {
      (video.textTracks[i] as any).mode = 'disabled';
    }
    
    // Enable the selected track (or leave all disabled if index is -1 for "Off")
    if (index >= 0 && index < video.textTracks.length) {
      (video.textTracks[index] as any).mode = 'showing';
      setSelectedTextTrack(index);
    } else {
      setSelectedTextTrack(-1);
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 w-screen h-screen bg-black overflow-hidden focus:outline-none z-50" 
      tabIndex={0}
      onClick={() => {
        // Ensure container stays focused for keyboard events
        containerRef.current?.focus();
      }}
    >
      {/* Clickable overlay to toggle play/pause */}
      <div 
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
      />
      
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain bg-black"
        controls={false}
        tabIndex={0}
        aria-label={title || 'Video Player'}
      />

      {/* Back Button - Top Left with auto-hide */}
      <button
        onClick={() => router.back()}
        className={`absolute top-8 left-8 z-30 text-white hover:scale-110 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-label="Go back"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className="w-12 h-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
      </button>

      {/* Bottom Controls with Gradient Overlay */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent px-12 pt-24 pb-8 flex flex-col gap-4 transition-all duration-300 z-20 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        
        {/* Progress bar - Netflix style thin line */}
        <div className="w-full group/progress cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          if (videoRef.current) {
            videoRef.current.currentTime = pos * duration;
          }
        }}>
          <div className="relative w-full h-1 bg-gray-600/50 rounded-full overflow-hidden group-hover/progress:h-2 transition-all">
            <div 
              className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-6">
          {/* Left controls */}
          <div className="flex items-center gap-4">
            {/* Play/Pause - Netflix thin icon style */}
            <button
              onClick={togglePlay}
              className="text-white hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-1"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              )}
            </button>

            {/* Skip backward */}
            <button
              onClick={() => skip(-10)}
              className="text-white hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-1"
              aria-label="Skip backward 10 seconds"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953l7.108-4.062A1.125 1.125 0 0121 8.688v8.123zM11.25 16.811c0 .864-.933 1.405-1.683.977l-7.108-4.062a1.125 1.125 0 010-1.953L9.567 7.71a1.125 1.125 0 011.683.977v8.123z" />
              </svg>
            </button>

            {/* Skip forward */}
            <button
              onClick={() => skip(10)}
              className="text-white hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-1"
              aria-label="Skip forward 10 seconds"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062A1.125 1.125 0 013 16.811V8.688zM12.75 8.688c0-.864.933-1.405 1.683-.977l7.108 4.062a1.125 1.125 0 010 1.953l-7.108 4.062a1.125 1.125 0 01-1.683-.977V8.688z" />
              </svg>
            </button>

            {/* Volume with hover slider */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="text-white hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-1"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/volume:w-24 group-hover/volume:opacity-100 transition-all h-1 accent-white cursor-pointer"
                aria-label="Volume"
              />
            </div>

            {/* Time display */}
            <span className="text-sm text-white font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-4">
            {/* Audio & Subtitles Settings */}
            <div className="relative group/settings">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-1"
                aria-label="Audio and Subtitles"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {isMenuOpen && (
                <div className="absolute bottom-full mb-2 right-0 bg-black/95 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden border border-white/10 min-w-[250px] max-h-[400px] overflow-y-auto">
                  {/* Audio Section */}
                  {audioTracks.length > 0 && (
                    <div className="border-b border-white/10">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Audio
                      </div>
                      {audioTracks.map((track: any, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            selectAudioTrack(index);
                            setIsMenuOpen(false);
                          }}
                          className={`block w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left ${selectedAudioTrack === index ? 'bg-white/20 font-semibold' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{track.label || `Audio Track ${index + 1}`}</span>
                            {selectedAudioTrack === index && (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Subtitles Section */}
                  <div>
                    <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Subtitles
                    </div>
                    {/* Off button */}
                    <button
                      onClick={() => {
                        selectTextTrack(-1);
                        setIsMenuOpen(false);
                      }}
                      className={`block w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left ${selectedTextTrack === -1 ? 'bg-white/20 font-semibold' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Off</span>
                        {selectedTextTrack === -1 && (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </button>
                    {textTracks.map((track: any, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          selectTextTrack(index);
                          setIsMenuOpen(false);
                        }}
                        className={`block w-full px-4 py-2.5 text-sm text-white hover:bg-white/10 transition-colors text-left ${selectedTextTrack === index ? 'bg-white/20 font-semibold' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{track.label || `Subtitle ${index + 1}`}</span>
                          {selectedTextTrack === index && (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Playback speed */}
            <div className="relative group/speed">
              <button
                className="text-white text-sm font-medium hover:scale-110 transition-transform px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                aria-label="Playback speed"
              >
                {playbackRate}x
              </button>
              <div className="absolute bottom-full mb-2 right-0 bg-black/95 backdrop-blur-sm rounded-lg shadow-2xl overflow-hidden opacity-0 group-hover/speed:opacity-100 transition-opacity pointer-events-none group-hover/speed:pointer-events-auto border border-white/10">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`block w-full px-6 py-2 text-sm text-white hover:bg-white/10 transition-colors text-left ${playbackRate === rate ? 'bg-white/20 font-semibold' : ''}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="text-white hover:scale-110 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full p-1"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
