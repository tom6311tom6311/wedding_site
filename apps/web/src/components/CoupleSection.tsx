import type { WeddingContent } from "../content/types";

type CoupleSectionProps = {
  couple: WeddingContent["couple"];
};

export function CoupleSection({ couple }: CoupleSectionProps) {
  return (
    <section className="page-section couple-section" id="couple">
      <div className="section-inner couple-inner">
        <div className="couple-layout">
          {couple.people.map((person) => (
            <article className="couple-person" key={`${person.role}-${person.name}`}>
              <div className="couple-copy">
                <p>{person.role}</p>
                <h3>{person.name}</h3>
              </div>
              <figure className="couple-portrait">
                <img
                  src={person.image.src}
                  alt={person.image.alt}
                  style={{
                    objectPosition: person.image.objectPosition,
                    transform:
                      person.image.offsetY || person.image.scale
                        ? `translateY(${person.image.offsetY ?? "0"}) scale(${person.image.scale ?? 1})`
                        : undefined,
                  }}
                />
              </figure>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
