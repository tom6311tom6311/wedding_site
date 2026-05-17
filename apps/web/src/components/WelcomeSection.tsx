import type { WeddingContent } from "../content/types";

type WelcomeSectionProps = {
  welcome: WeddingContent["welcome"];
};

export function WelcomeSection({ welcome }: WelcomeSectionProps) {
  return (
    <section className="page-section intro-section" id="welcome">
      <div className="section-inner section-inner--narrow">
        <p className="section-eyebrow">{welcome.eyebrow}</p>
        <h2>{welcome.title}</h2>
        {welcome.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
