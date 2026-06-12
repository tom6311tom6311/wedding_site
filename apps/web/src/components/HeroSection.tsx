import { useEffect, useState } from "react";
import type { WeddingContent } from "../content/types";
import { ImageCarousel } from "./presentational/ImageCarousel";

type HeroProps = {
  hero: WeddingContent["hero"];
};

export function HeroSection({ hero }: HeroProps) {
  const slides = hero.images && hero.images.length > 0 ? hero.images : [hero.image];
  const carouselIntervalMs = hero.carousel.intervalMs;
  const nextSlideSrc = slides[1]?.src;
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduceMotion.matches) {
      return;
    }

    let isCancelled = false;
    let interval: number | undefined;
    let timeout: number | undefined;

    const advanceSlide = () => {
      setActiveSlide((current) => (current + 1) % slides.length);
    };

    const startInterval = () => {
      interval = window.setInterval(advanceSlide, carouselIntervalMs);
    };

    const nextImageReady = waitForImageDecode(nextSlideSrc);

    timeout = window.setTimeout(() => {
      void nextImageReady.finally(() => {
        if (isCancelled) {
          return;
        }

        advanceSlide();
        startInterval();
      });
    }, carouselIntervalMs);

    return () => {
      isCancelled = true;

      if (timeout) {
        window.clearTimeout(timeout);
      }

      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [carouselIntervalMs, nextSlideSrc, slides.length]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <ImageCarousel
        activeSlide={activeSlide}
        images={slides}
        onSelectSlide={setActiveSlide}
      />
      <div className="hero__overlay" />
      <HeroDecorations />

      <div className="hero__content">
        {hero.eyebrow ? <p className="hero__eyebrow">{hero.eyebrow}</p> : null}
        <h1 className="hero__names" id="hero-title">
          <span>{hero.coupleNames.groom}</span>
          <span className="hero__double-happiness" aria-label="double happiness">
            {hero.coupleNames.symbol}
          </span>
          <span>{hero.coupleNames.bride}</span>
        </h1>
        <p className="hero__date">{hero.dateLine}</p>
        <p className="hero__message">{hero.message}</p>
        <div className="hero__actions">
          {hero.actions.map((action) => (
            <a
              key={action.href}
              className={`button button--${action.variant}`}
              href={action.href}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>

    </section>
  );
}

function waitForImageDecode(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();

    image.decoding = "async";
    image.fetchPriority = "high";
    image.onload = () => {
      if (typeof image.decode !== "function") {
        resolve();
        return;
      }

      image.decode().then(resolve, resolve);
    };
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) {
      image.onload?.(new Event("load"));
    }
  });
}

function HeroDecorations() {
  return (
    <>
      <img
        className="hero__decoration hero__decoration--top"
        src="/images/hero-rose-top-right.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
      />
      <img
        className="hero__decoration hero__decoration--bottom"
        src="/images/hero-rose-bottom-left.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
      />
    </>
  );
}
