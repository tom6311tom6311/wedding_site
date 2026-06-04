import { useEffect, useRef, useState } from "react";
import type { WeddingContent } from "../content/types";

type BackgroundMusicProps = {
  music?: WeddingContent["music"];
};

const MUSIC_CONSENT_STORAGE_KEY = "wedding-site:music-consent";
const DEFAULT_MUSIC_CONSENT = {
  eyebrow: "Music",
  title: "Background music",
  description:
    "This invitation can play background music. You can pause or play it again anytime with the button in the lower-right corner.",
  acceptLabel: "Play music",
  dismissLabel: "Not now",
};

export function BackgroundMusic({ music }: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [hasMusicConsent, setHasMusicConsent] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [shouldShowConsent, setShouldShowConsent] = useState(false);

  useEffect(() => {
    if (!music?.enabled || !music.src) {
      return;
    }

    const storedConsent = readStoredConsent();

    if (storedConsent === "accepted") {
      setHasMusicConsent(true);
      return;
    }

    if (storedConsent !== "dismissed") {
      setShouldShowConsent(true);
    }
  }, [music?.enabled, music?.src]);

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

  useEffect(() => {
    if (hasMusicConsent && shouldPlay && audioSrc) {
      void playMusic();
    }
  }, [audioSrc, hasMusicConsent, shouldPlay]);

  if (!music?.enabled || !music.src) {
    return null;
  }

  const enabledMusic = music;
  const consent = enabledMusic.consent ?? DEFAULT_MUSIC_CONSENT;

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
    if (hasMusicConsent && shouldPlay) {
      void playMusic();
    }
  }

  function rememberConsent(value: "accepted" | "dismissed") {
    try {
      window.localStorage.setItem(MUSIC_CONSENT_STORAGE_KEY, value);
    } catch {
      // Visitors can still choose music even when localStorage is unavailable.
    }
    setShouldShowConsent(false);
  }

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      rememberConsent("accepted");
      setShouldPlay(true);
      setHasMusicConsent(true);
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

  function acceptMusic() {
    rememberConsent("accepted");
    setHasMusicConsent(true);
    setShouldPlay(true);

    if (!audioSrc) {
      setAudioSrc(enabledMusic.src);
      return;
    }

    void playMusic();
  }

  function dismissMusic() {
    rememberConsent("dismissed");
    setHasMusicConsent(false);
    setShouldPlay(false);
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
      {shouldShowConsent ? (
        <div className="music-consent" role="presentation">
          <div
            className="music-consent__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="music-consent-title"
            aria-describedby="music-consent-description"
          >
            <p className="music-consent__eyebrow">{consent.eyebrow}</p>
            <h2 id="music-consent-title">{consent.title}</h2>
            <p id="music-consent-description">{consent.description}</p>
            <div className="music-consent__actions">
              <button type="button" className="music-consent__primary" onClick={acceptMusic}>
                {consent.acceptLabel}
              </button>
              <button type="button" className="music-consent__secondary" onClick={dismissMusic}>
                {consent.dismissLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function readStoredConsent() {
  try {
    return window.localStorage.getItem(MUSIC_CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}
