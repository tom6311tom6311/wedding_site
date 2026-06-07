import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { WeddingContent } from "../content/types";

type StorySectionProps = {
  story: WeddingContent["story"];
};

type StoryMilestone = WeddingContent["story"]["milestones"][number];
type StoryImages = WeddingContent["story"]["fallbackImages"];

export function StorySection({ story }: StorySectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isStoryOpen, setIsStoryOpen] = useState(!story.cover);
  const activeMilestone = story.milestones[activeIndex];
  const totalMilestones = story.milestones.length;
  const visiblePileMilestones = story.milestones.slice(activeIndex + 1, activeIndex + 4);

  function showPreviousCard() {
    if (activeIndex === 0 && story.cover) {
      setIsStoryOpen(false);
      return;
    }

    setActiveIndex((current) => Math.max(0, current - 1));
  }

  function showNextCard() {
    setActiveIndex((current) => Math.min(totalMilestones - 1, current + 1));
  }

  if (!activeMilestone) {
    return null;
  }

  return (
    <section className="page-section story-section" id="story">
      <div className="section-inner story-inner">
        <div className="section-heading">
          {story.eyebrow ? <p className="section-eyebrow">{story.eyebrow}</p> : null}
          <h2>{story.title}</h2>
        </div>
        <div className="story-stage">
          <div className="story-stack">
            {isStoryOpen ? (
              <>
                {visiblePileMilestones.map((milestone, index) => (
                  <StoryPileCard
                    milestone={milestone}
                    fallbackImages={story.fallbackImages}
                    key={`${milestone.year}-${milestone.title}-pile-${index}`}
                    level={index + 1}
                  />
                ))}
                <StoryCard
                  milestone={activeMilestone}
                  fallbackImages={story.fallbackImages}
                  activeIndex={activeIndex}
                  key={`${activeMilestone.year}-${activeMilestone.title}`}
                />
              </>
            ) : story.cover ? (
              <StoryCover image={story.cover.image} />
            ) : null}
          </div>
          {isStoryOpen ? (
            <div className="story-controls" aria-label="故事切換">
              {activeIndex > 0 || story.cover ? (
                <button type="button" onClick={showPreviousCard} aria-label="上一段故事">
                  ‹
                </button>
              ) : (
                <span className="story-control-spacer" aria-hidden="true" />
              )}
              <div className="story-progress" aria-hidden="true">
                {story.milestones.map((milestone, index) => (
                  <span
                    className={index === activeIndex ? "story-progress__dot--active" : ""}
                    key={`${milestone.year}-${milestone.title}`}
                  />
                ))}
              </div>
              {activeIndex < totalMilestones - 1 ? (
                <button type="button" onClick={showNextCard} aria-label="下一段故事">
                  ›
                </button>
              ) : (
                <span className="story-control-spacer" aria-hidden="true" />
              )}
            </div>
          ) : story.cover ? (
            <div className="story-controls story-controls--cover">
              <button
                type="button"
                onClick={() => setIsStoryOpen(true)}
                aria-label={story.cover.openAriaLabel}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function StoryCover({ image }: { image: StoryImages[number] }) {
  return (
    <article className="story-card story-card--cover">
      <img
        className={image.fit === "contain" ? "story-cover-image--contain" : ""}
        src={image.src}
        alt={image.alt}
        loading="lazy"
      />
    </article>
  );
}

function StoryPileCard({
  milestone,
  fallbackImages,
  level,
}: {
  milestone: StoryMilestone;
  fallbackImages: StoryImages;
  level: number;
}) {
  const image = milestone.images?.[0] ?? fallbackImages[level % fallbackImages.length];

  return (
    <article
      className="story-card story-card--pile"
      style={{
        "--story-pile-level": level,
      } as CSSProperties}
    >
      <figure className="story-photo-frame">
        <img
          className={[
            "story-photo--active",
            image.fit === "contain" ? "story-photo--contain" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          src={image.src}
          alt=""
          loading="lazy"
        />
      </figure>
      <div className="story-card__copy">
        <h3>{milestone.title}</h3>
        <span>{milestone.year}</span>
      </div>
    </article>
  );
}

function StoryCard({
  milestone,
  fallbackImages,
  activeIndex,
}: {
  milestone: StoryMilestone;
  fallbackImages: StoryImages;
  activeIndex: number;
}) {
  const images = useMemo(
    () => (milestone.images?.length ? milestone.images : fallbackImages),
    [fallbackImages, milestone.images],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [activeIndex]);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % images.length);
    }, 3600);

    return () => window.clearInterval(timer);
  }, [images.length]);

  return (
    <article className="story-card">
      <figure className="story-photo-frame">
        {images.map((image, index) => (
          <img
            className={[
              index === activeImageIndex ? "story-photo--active" : "",
              image.fit === "contain" ? "story-photo--contain" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            src={image.src}
            alt={image.alt}
            key={`${image.src}-${index}`}
            loading="lazy"
          />
        ))}
        {images.length > 1 ? (
          <div className="story-photo-dots" aria-hidden="true">
            {images.map((image, index) => (
              <span
                className={index === activeImageIndex ? "story-photo-dots__dot--active" : ""}
                key={`${image.src}-dot-${index}`}
              />
            ))}
          </div>
        ) : null}
      </figure>
      <div className="story-card__copy">
        <h3>{milestone.title}</h3>
        <span>{milestone.year}</span>
        <p>{milestone.body}</p>
      </div>
    </article>
  );
}
