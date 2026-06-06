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
        {welcome.featureImage ? (
          <figure className="welcome-feature">
            <img
              src={welcome.featureImage.src}
              alt={welcome.featureImage.alt}
              loading="lazy"
            />
          </figure>
        ) : null}
        {welcome.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
