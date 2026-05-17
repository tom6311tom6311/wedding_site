import type { WeddingContent } from "../content/types";

type HeroProps = {
  hero: WeddingContent["hero"];
  navigation: WeddingContent["navigation"];
};

export function HeroSection({ hero, navigation }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero__image" src={hero.image.src} alt={hero.image.alt} />
      <div className="hero__overlay" />

      <nav className="hero__nav" aria-label="Wedding navigation">
        {navigation.map((item) => (
          <a
            key={item.href}
            className={item.featured ? "hero__nav-rsvp" : undefined}
            href={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="hero__content">
        <p className="hero__eyebrow">{hero.eyebrow}</p>
        <h1 id="hero-title">{hero.title}</h1>
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
