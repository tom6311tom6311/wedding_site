import type { CSSProperties } from "react";
import type { WeddingContent } from "../content/types";

type ScheduleSectionProps = {
  schedule: WeddingContent["schedule"];
};

export function ScheduleSection({ schedule }: ScheduleSectionProps) {
  return (
    <section className="page-section schedule-section" id="schedule">
      <div className="section-inner schedule-inner">
        <div className="section-heading schedule-heading">
          <p className="section-eyebrow">{schedule.eyebrow}</p>
          <h2>{schedule.title}</h2>
        </div>
        <div className="schedule-list">
          <svg
            className="schedule-path-line"
            viewBox="0 0 120 720"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M62 18 C24 116 114 182 61 282 C15 366 103 439 63 536 C35 607 65 654 96 704" />
          </svg>

          {schedule.events.map((event) => (
            <article
              className="schedule-item"
              key={`${event.time}-${event.title}`}
              style={getScheduleMarkerStyle(event.markerX)}
            >
              <div className="schedule-marker" aria-hidden="true" />
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
                    <img
                      className="schedule-photo"
                      key={image.src}
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                    />
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
    </section>
  );
}

function getScheduleMarkerStyle(markerX: string | undefined): CSSProperties | undefined {
  if (!markerX) {
    return undefined;
  }

  return { "--schedule-marker-x": markerX } as CSSProperties;
}
