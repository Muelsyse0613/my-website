'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ================================================================
   Supabase client
   ================================================================ */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ================================================================
   Types
   ================================================================ */

type Track = {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  cover_art_url: string | null;
  audio_url: string;
  duration: number | null;
  sort_order: number;
};

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/* ================================================================
   Helpers
   ================================================================ */

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/* ================================================================
   SVG Icons (inline, zero external deps)
   ================================================================ */

function PlayIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

function PauseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function SkipNextIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 4l10 8-10 8V4zm13 0v16h2V4h-2z" />
    </svg>
  );
}

function SkipPrevIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 20l-10-8 10-8v16zM6 4H4v16h2V4z" />
    </svg>
  );
}

function VolumeOnIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function VolumeOffIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function MusicNoteIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function ChevronDownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronUpIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function AlertIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/* ================================================================
   Sub-components
   ================================================================ */

function MinimizedButton({
  coverUrl,
  isPlaying,
  playerState,
  onClick,
}: {
  coverUrl: string | null;
  isPlaying: boolean;
  playerState: PlayerState;
  onClick: () => void;
}) {
  const isLoading = playerState === 'loading';

  return (
    <button
      className="mp-mini-btn"
      onClick={onClick}
      aria-label={isPlaying ? '展开播放器（正在播放）' : '展开播放器'}
    >
      {isPlaying && <span className="mp-mini-pulse" aria-hidden="true" />}

      {coverUrl ? (
        <img
          className={`mp-mini-thumb ${isPlaying ? 'mp-cover-spinning' : ''}`}
          src={coverUrl}
          alt=""
          aria-hidden="true"
        />
      ) : (
        <span className={`mp-mini-icon ${isLoading ? 'animate-pulse' : ''}`}>
          <MusicNoteIcon size={22} />
        </span>
      )}
    </button>
  );
}

function ExpandedPlayer({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playerState,
  hasError,
  currentIndex,
  totalTracks,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onMinimize,
  onRetry,
}: {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playerState: PlayerState;
  hasError: boolean;
  currentIndex: number;
  totalTracks: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onMinimize: () => void;
  onRetry: () => void;
}) {
  const isLoading = playerState === 'loading';
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mp-expanded-panel glass-panel ak-card rounded-[2rem] p-5 sm:p-6">
      <span className="ak-corner ak-corner-tl" />
      <span className="ak-corner ak-corner-br" />

      <div className="panel-inner">
        {/* Header: minimize button */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Now Playing
          </p>
          <button
            className="mp-ctrl-btn"
            style={{ width: '2rem', height: '2rem' }}
            onClick={onMinimize}
            aria-label="最小化播放器"
          >
            <ChevronDownIcon size={16} />
          </button>
        </div>

        {/* Cover art */}
        <div className="mp-cover-wrapper mb-4">
          {track.cover_art_url ? (
            <img
              className={`mp-cover-img ${isPlaying ? 'mp-cover-spinning' : ''}`}
              src={track.cover_art_url}
              alt={track.title}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 text-blue-400">
              <MusicNoteIcon size={48} />
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="mb-4 min-w-0">
          <h3 className="truncate text-lg font-black text-slate-900">
            {track.title}
          </h3>
          {track.artist && (
            <p className="mt-0.5 truncate text-sm font-bold text-slate-500">
              {track.artist}
              {track.album && (
                <span className="font-normal text-slate-400">
                  {' '}— {track.album}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Seek bar */}
        <div className="mb-3">
          <input
            type="range"
            className="mp-slider"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="播放进度"
            disabled={hasError || playerState === 'idle' || playerState === 'loading'}
          />
          <div className="mt-1 flex justify-between">
            <span className="mp-time">{formatTime(currentTime)}</span>
            <span className="mp-time">
              {duration > 0 ? formatTime(duration) : '--:--'}
            </span>
          </div>
        </div>

        {/* Controls row */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            className="mp-ctrl-btn"
            onClick={onPrev}
            aria-label="上一首"
            disabled={totalTracks <= 1}
          >
            <SkipPrevIcon />
          </button>

          <button
            className="mp-ctrl-btn mp-ctrl-btn-primary"
            onClick={hasError ? onRetry : onPlayPause}
            aria-label={hasError ? '重试' : isPlaying ? '暂停' : '播放'}
            disabled={playerState === 'loading'}
          >
            {hasError ? (
              <AlertIcon size={22} />
            ) : isLoading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : isPlaying ? (
              <PauseIcon />
            ) : (
              <PlayIcon />
            )}
          </button>

          <button
            className="mp-ctrl-btn"
            onClick={onNext}
            aria-label="下一首"
            disabled={totalTracks <= 1}
          >
            <SkipNextIcon />
          </button>
        </div>

        {/* Volume row */}
        <div className="flex items-center gap-2">
          <button
            className="mp-ctrl-btn"
            style={{ width: '2rem', height: '2rem', flexShrink: 0 }}
            onClick={onToggleMute}
            aria-label={isMuted ? '取消静音' : '静音'}
          >
            {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeOnIcon />}
          </button>
          <input
            type="range"
            className="mp-slider mp-slider-sm"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            aria-label="音量"
          />
        </div>

        {/* Track counter */}
        <p className="mt-3 text-center text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-400">
          {currentIndex + 1} / {totalTracks}
        </p>
      </div>
    </div>
  );
}

function TrackList({
  tracks,
  currentIndex,
  onSelect,
}: {
  tracks: Track[];
  currentIndex: number;
  onSelect: (i: number) => void;
}) {
  if (tracks.length <= 1) return null;

  return (
    <div className="mp-track-list mt-4">
      {tracks.map((t, i) => (
        <div
          key={t.id}
          className={`mp-track-item ${i === currentIndex ? 'mp-track-item-active' : ''}`}
          onClick={() => onSelect(i)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(i);
          }}
        >
          {t.cover_art_url ? (
            <img className="mp-track-item-thumb" src={t.cover_art_url} alt="" />
          ) : (
            <span className="mp-track-item-placeholder">
              <MusicNoteIcon size={12} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="mp-track-item-title">{t.title}</p>
            {t.artist && <p className="mp-track-item-artist">{t.artist}</p>}
          </div>
          {i === currentIndex && (
            <span className="mp-track-item-indicator" aria-hidden="true" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Main export
   ================================================================ */

export default function MusicPlayer() {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevVolumeRef = useRef(0.7);
  const isPlayingRef = useRef(false);

  /* ---- Mount: fetch tracks ---- */
  useEffect(() => {
    setMounted(true);

    async function init() {
      const { data, error } = await supabase
        .from('tracks')
        .select('id,title,artist,album,cover_art_url,audio_url,duration,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setTracks(data as Track[]);
      }
    }

    init();
  }, []);

  /* ---- Create audio element on mount ---- */
  useEffect(() => {
    if (!mounted || tracks.length === 0) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = 0.7;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [mounted, tracks.length]);

  /* ---- Load track src when index changes ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    const track = tracks[currentIndex];
    if (!track) return;

    setHasError(false);
    setPlayerState('loading');
    setCurrentTime(0);
    setDuration(0);

    audio.src = track.audio_url;
    audio.load();
  }, [currentIndex, tracks]);

  /* ---- Audio event binding ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setPlayerState('paused');
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setPlayerState('playing');
      isPlayingRef.current = true;
    };

    const onPause = () => {
      setIsPlaying(false);
      setPlayerState('paused');
      isPlayingRef.current = false;
    };

    const onEnded = () => {
      setCurrentIndex((prev) => (prev + 1) % tracks.length);
    };

    const onError = () => {
      setHasError(true);
      setPlayerState('error');
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    const onWaiting = () => {
      setPlayerState('loading');
    };

    const onCanPlay = () => {
      if (isPlayingRef.current) {
        setPlayerState('playing');
      } else {
        setPlayerState('paused');
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [tracks.length]);

  /* ---- Volume sync ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  /* ---- Handlers ---- */
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().catch(() => {
        // Browser may block autoplay
      });
    } else {
      audio.pause();
    }
  }, []);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const wasPlaying = isPlayingRef.current;
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    // Auto-play after track change
    if (wasPlaying) {
      isPlayingRef.current = true;
    }
  }, [tracks.length]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const wasPlaying = isPlayingRef.current;
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    if (wasPlaying) {
      isPlayingRef.current = true;
    }
  }, [tracks.length]);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    if (isMuted && vol > 0) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVolumeRef.current || 0.7);
    } else {
      prevVolumeRef.current = volume;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const handleRetry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    const track = tracks[currentIndex];
    if (!track) return;

    setHasError(false);
    setPlayerState('loading');
    audio.src = track.audio_url;
    audio.load();
  }, [tracks, currentIndex]);

  const selectTrack = useCallback((index: number) => {
    if (index === currentIndex) {
      // Same track: toggle play/pause
      togglePlayPause();
      return;
    }
    setCurrentIndex(index);
    // Trigger auto-play after track change
    isPlayingRef.current = true;
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio && isPlayingRef.current) {
        audio.play().catch(() => {});
      }
    }, 100);
  }, [currentIndex, togglePlayPause]);

  /* ---- Auto-play after src loads ---- */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tracks.length === 0) return;

    const autoPlayAfterLoad = () => {
      if (isPlayingRef.current && audio.src && !audio.error) {
        audio.play().catch(() => {});
        isPlayingRef.current = false;
      }
    };

    audio.addEventListener('canplay', autoPlayAfterLoad, { once: true });
    return () => {
      audio.removeEventListener('canplay', autoPlayAfterLoad);
    };
  }, [currentIndex, tracks.length]);

  /* ---- Render nothing before mount or without tracks ---- */
  if (!mounted || tracks.length === 0) return null;

  const currentTrack = tracks[currentIndex];
  if (!currentTrack) return null;

  return (
    <div className="music-player-root" aria-label="Music player">
      {expanded ? (
        <div className="flex flex-col">
          <ExpandedPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            playerState={playerState}
            hasError={hasError}
            currentIndex={currentIndex}
            totalTracks={tracks.length}
            onPlayPause={togglePlayPause}
            onPrev={prevTrack}
            onNext={nextTrack}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={toggleMute}
            onMinimize={() => setExpanded(false)}
            onRetry={handleRetry}
          />
          <TrackList
            tracks={tracks}
            currentIndex={currentIndex}
            onSelect={selectTrack}
          />
        </div>
      ) : (
        <MinimizedButton
          coverUrl={currentTrack.cover_art_url}
          isPlaying={isPlaying}
          playerState={playerState}
          onClick={() => setExpanded(true)}
        />
      )}
    </div>
  );
}