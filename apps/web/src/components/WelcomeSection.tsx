import type { WeddingContent } from "../content/types";

type WelcomeSectionProps = {
  welcome: WeddingContent["welcome"];
};

export function WelcomeSection({ welcome }: WelcomeSectionProps) {
  return (
    <section className="page-section intro-section" id="welcome">
      <div className="section-inner section-inner--narrow welcome-inner">
        <div className="section-heading">
          <h2>{welcome.title}</h2>
        </div>
        {welcome.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {welcome.illustration ? (
          <figure className="welcome-illustration">
            <img
              src={welcome.illustration.src}
              alt={welcome.illustration.alt}
              loading="lazy"
            />
          </figure>
        ) : null}
      </div>
    </section>
  );
}
