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
  const [turnDirection, setTurnDirection] = useState<"next" | "previous">("next");
  const [isTurningPage, setIsTurningPage] = useState(false);
  const activeMilestone = story.milestones[activeIndex];
  const totalMilestones = story.milestones.length;
  const visiblePileMilestones = story.milestones.slice(activeIndex + 1, activeIndex + 4);

  useEffect(() => {
    if (!isTurningPage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIsTurningPage(false);
    }, 1700);

    return () => window.clearTimeout(timer);
  }, [activeIndex, isStoryOpen, isTurningPage]);

  function handleTurnAnimationEnd() {
    setIsTurningPage(false);
  }

  function showPreviousCard() {
    setTurnDirection("previous");
    setIsTurningPage(true);

    if (activeIndex === 0 && story.cover) {
      setIsStoryOpen(false);
      return;
    }

    setActiveIndex((current) => Math.max(0, current - 1));
  }

  function showNextCard() {
    setTurnDirection("next");
    setIsTurningPage(true);
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
                  turnDirection={turnDirection}
                  isTurningPage={isTurningPage}
                  onTurnAnimationEnd={handleTurnAnimationEnd}
                  key={`${activeMilestone.year}-${activeMilestone.title}`}
                />
              </>
            ) : story.cover ? (
              <StoryCover
                image={story.cover.image}
                turnDirection={turnDirection}
                isTurningPage={isTurningPage}
                onTurnAnimationEnd={handleTurnAnimationEnd}
              />
            ) : null}
          </div>
          {isStoryOpen ? (
            <div className="story-controls" aria-label={story.controls.label}>
              {activeIndex > 0 || story.cover ? (
                <button
                  type="button"
                  onClick={showPreviousCard}
                  aria-label={story.controls.previousAriaLabel}
                >
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
                <button
                  type="button"
                  onClick={showNextCard}
                  aria-label={story.controls.nextAriaLabel}
                >
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
                onClick={() => {
                  setTurnDirection("next");
                  setIsTurningPage(true);
                  setIsStoryOpen(true);
                }}
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

function StoryCover({
  image,
  turnDirection,
  isTurningPage,
  onTurnAnimationEnd,
}: {
  image: StoryImages[number];
  turnDirection: "next" | "previous";
  isTurningPage: boolean;
  onTurnAnimationEnd: () => void;
}) {
  return (
    <article
      className={[
        "story-card",
        "story-card--cover",
        isTurningPage ? `story-card--turn-${turnDirection}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onAnimationEnd={onTurnAnimationEnd}
    >
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
  turnDirection,
  isTurningPage,
  onTurnAnimationEnd,
}: {
  milestone: StoryMilestone;
  fallbackImages: StoryImages;
  activeIndex: number;
  turnDirection: "next" | "previous";
  isTurningPage: boolean;
  onTurnAnimationEnd: () => void;
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
    <article
      className={[
        "story-card",
        isTurningPage ? `story-card--turn-${turnDirection}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onAnimationEnd={onTurnAnimationEnd}
    >
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
        <p>
          {toStoryBodyLines(milestone.body).map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </p>
      </div>
    </article>
  );
}

function toStoryBodyLines(body: StoryMilestone["body"]) {
  return Array.isArray(body) ? body : [body];
}
