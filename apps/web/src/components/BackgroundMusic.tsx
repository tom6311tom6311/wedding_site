import { useEffect, useRef, useState } from "react";
import type { WeddingContent } from "../content/types";

type BackgroundMusicProps = {
  music?: WeddingContent["music"];
};

export function BackgroundMusic({ music }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasTriedAutoPlayRef = useRef(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (!audioRef.current || !music) {
      return;
    }

    audioRef.current.volume = Math.min(Math.max(music.volume ?? 0.42, 0), 1);
  }, [music]);

  useEffect(() => {
    if (!music?.enabled || !music.src) {
      return;
    }

    setAudioSrc(null);
    hasTriedAutoPlayRef.current = false;

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const attachAudio = () => {
      if (!cancelled) {
        setAudioSrc(music.src);
      }
    };

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(attachAudio, { timeout: 2500 });
    } else {
      timeoutId = globalThis.setTimeout(attachAudio, 1200);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    };
  }, [music?.enabled, music?.src]);

  if (!music?.enabled || !music.src) {
    return null;
  }

  const enabledMusic = music;

  async function playMusic() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  function handleCanPlay() {
    if (!hasTriedAutoPlayRef.current) {
      hasTriedAutoPlayRef.current = true;
      void playMusic();
      return;
    }

    if (shouldPlay) {
      void playMusic();
    }
  }

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      setShouldPlay(true);
      if (!audioSrc) {
        setAudioSrc(enabledMusic.src);
        return;
      }
      await playMusic();
      return;
    }

    setShouldPlay(false);
    audio.pause();
    setIsPlaying(false);
  }

  return (
    <div className="music-widget">
      <audio
        ref={audioRef}
        src={audioSrc ?? undefined}
        loop={enabledMusic.loop ?? true}
        preload={audioSrc ? "auto" : "none"}
        aria-label={enabledMusic.title}
        onCanPlay={handleCanPlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      <button
        className={`music-control${isPlaying ? " music-control--playing" : ""}`}
        type="button"
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
        aria-pressed={isPlaying}
        onClick={toggleMusic}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {isPlaying ? (
            <>
              <rect x="7" y="5" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
            </>
          ) : (
            <path d="M8 5.8c0-.8.9-1.2 1.6-.8l8.3 5.4c.6.4.6 1.3 0 1.7l-8.3 5.4c-.7.4-1.6 0-1.6-.8V5.8Z" />
          )}
        </svg>
      </button>
    </div>
  );
}
