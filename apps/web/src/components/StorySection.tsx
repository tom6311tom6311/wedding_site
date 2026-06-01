import type { WeddingContent } from "../content/types";
import picnicMusic from "../assets/decorations/picnic-music.png";

type StorySectionProps = {
  story: WeddingContent["story"];
};

export function StorySection({ story }: StorySectionProps) {
  return (
    <section className="page-section story-section" id="story">
      <div className="section-inner">
        <div className="section-heading">
          <h2>{story.title}</h2>
        </div>
        <div className="timeline">
          <img
            className="section-decor section-decor--story"
            src={picnicMusic}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          {story.milestones.map((milestone) => (
            <article className="timeline-item" key={milestone.title}>
              <span>{milestone.year}</span>
              <h3>{milestone.title}</h3>
              <p>{milestone.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
