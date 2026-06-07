import { useEffect, useRef, useState } from "react";
import type { WeddingContent } from "../content/types";

type WelcomeSectionProps = {
  welcome: WeddingContent["welcome"];
};

export function WelcomeSection({ welcome }: WelcomeSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section || isVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <section
      className={`page-section intro-section${isVisible ? " intro-section--visible" : ""}`}
      id="welcome"
      ref={sectionRef}
    >
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
        {chunkParagraphs(welcome.body, 2).map((paragraphGroup, index) => (
          <p
            key={paragraphGroup.join("")}
            style={{
              animationDelay: `${0.35 + index * 0.85}s`,
            }}
          >
            {paragraphGroup.map((paragraph) => (
              <span key={paragraph}>{paragraph}</span>
            ))}
          </p>
        ))}
      </div>
    </section>
  );
}

function chunkParagraphs(paragraphs: string[], size: number) {
  return Array.from(
    { length: Math.ceil(paragraphs.length / size) },
    (_, index) => paragraphs.slice(index * size, index * size + size),
  );
}
