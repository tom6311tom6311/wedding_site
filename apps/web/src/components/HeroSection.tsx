import { useEffect, useState } from "react";
import type { WeddingContent } from "../content/types";
import { ImageCarousel } from "./presentational/ImageCarousel";

type HeroProps = {
  hero: WeddingContent["hero"];
};

export function HeroSection({ hero }: HeroProps) {
  const slides = hero.images && hero.images.length > 0 ? hero.images : [hero.image];
  const carouselIntervalMs = hero.carousel.intervalMs;
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (reduceMotion.matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, carouselIntervalMs);

    return () => window.clearInterval(interval);
  }, [carouselIntervalMs, slides.length]);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <ImageCarousel
        activeSlide={activeSlide}
        images={slides}
        onSelectSlide={setActiveSlide}
      />
      <div className="hero__overlay" />

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
