import { useEffect, useState } from "react";
import type { WeddingContent } from "../content/types";
import picnicBike from "../assets/decorations/picnic-bike.png";

type ScheduleImage = NonNullable<
  WeddingContent["schedule"]["events"][number]["images"]
>[number];

type ScheduleSectionProps = {
  schedule: WeddingContent["schedule"];
};

export function ScheduleSection({ schedule }: ScheduleSectionProps) {
  const [selectedImage, setSelectedImage] = useState<ScheduleImage | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedImage]);

  return (
    <section className="page-section schedule-section" id="schedule">
      <div className="section-inner schedule-inner">
        <div className="section-heading schedule-heading">
          <h2>{schedule.title}</h2>
        </div>
        <div className="schedule-list">
          <img
            className="section-decor section-decor--schedule"
            src={picnicBike}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <svg
            className="schedule-rail"
            viewBox="0 0 120 820"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="schedule-rail__path"
              d="M60 18 C35 120 88 196 60 300 C32 414 91 494 60 612 C44 680 50 748 60 820"
            />
          </svg>

          {schedule.events.map((event) => (
            <article
              className="schedule-item"
              key={`${event.time}-${event.title}`}
            >
              <div className="schedule-card">
                <time>{event.time}</time>
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.body}</p>
                </div>
              </div>
              {event.images && event.images.length > 0 ? (
                <div className="schedule-photo-grid">
                  {event.images.map((image) => (
                    <button
                      className="schedule-photo-button"
                      key={image.src}
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      aria-label={`放大檢視 ${image.alt}`}
                    >
                      <img
                        className="schedule-photo"
                        src={image.src}
                        alt={image.alt}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="schedule-scene" aria-hidden="true">
                  <span className="schedule-scene__sun" />
                  <span className="schedule-scene__blanket" />
                  <span className="schedule-scene__flower schedule-scene__flower--one" />
                  <span className="schedule-scene__flower schedule-scene__flower--two" />
                  <span className="schedule-scene__grass" />
                </div>
              )}
            </article>
          ))}
          <p className="schedule-ending">Happy ending</p>
        </div>
      </div>
      {selectedImage ? (
        <div
          className="image-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={selectedImage.alt}
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="image-viewer__close"
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="關閉圖片"
          >
            ×
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
