import type { WeddingContent } from "../content/types";

type HeroProps = {
  hero: WeddingContent["hero"];
};

export function HeroSection({ hero }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero__image" src={hero.image.src} alt={hero.image.alt} />
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
