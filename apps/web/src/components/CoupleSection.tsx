import type { WeddingContent } from "../content/types";
import type { ImageAsset } from "../content/types";

type CoupleSectionProps = {
  couple: WeddingContent["couple"];
};

export function CoupleSection({ couple }: CoupleSectionProps) {
  const parents = couple.people.flatMap((person, index) =>
    person.parents
      ? [
          {
            parents: person.parents,
            side: (index === 0 ? "bride" : "groom") as "bride" | "groom",
          },
        ]
      : [],
  );

  return (
    <section className="page-section couple-section" id="couple">
      <div className="section-inner couple-inner">
        <div className="section-heading couple-heading">
          <h2>{couple.title}</h2>
        </div>
        <div className="couple-layout">
          {couple.people.map((person, index) => (
            <article className="couple-person" key={`${person.role}-${person.name}`}>
              <div className="couple-copy">
                <p>{person.role}</p>
                <h3>{person.name}</h3>
                {person.introduction ? (
                  <p className="couple-introduction">{person.introduction}</p>
                ) : null}
              </div>
              <figure className="couple-portrait">
                <span className="couple-portrait-frame">
                  <CroppedImage image={person.image} />
                </span>
              </figure>
            </article>
          ))}
          {parents.map(({ parents, side }) => (
            <ParentsCard key={`${side}-${parents.title}`} parents={parents} side={side} />
          ))}
        </div>
      </div>
    </section>
  );
}

type ParentsCardProps = {
  parents: NonNullable<WeddingContent["couple"]["people"][number]["parents"]>;
  side: "bride" | "groom";
};

function ParentsCard({ parents, side }: ParentsCardProps) {
  return (
    <section className={`parents-card parents-card--${side}`} aria-label={parents.title}>
      <figure className="parents-photo">
        <CroppedImage image={parents.image} />
      </figure>
      <div className="parents-copy">
        <p className="parents-title">{parents.title}</p>
        <div className="parent-list">
          <ParentIntro parent={parents.dad} />
          <ParentIntro parent={parents.mom} />
        </div>
      </div>
    </section>
  );
}

function CroppedImage({ image }: { image: ImageAsset }) {
  return (
    <img
      src={image.src}
      alt={image.alt}
      style={{
        objectPosition: image.objectPosition,
        transform:
          image.offsetY || image.scale
            ? `translateY(${image.offsetY ?? "0"}) scale(${image.scale ?? 1})`
            : undefined,
      }}
    />
  );
}

type ParentIntroProps = {
  parent: {
    name: string;
    introduction: string;
  };
};

function ParentIntro({ parent }: ParentIntroProps) {
  return (
    <div className="parent-intro">
      <h4>{parent.name}</h4>
      <p>{parent.introduction}</p>
    </div>
  );
}
