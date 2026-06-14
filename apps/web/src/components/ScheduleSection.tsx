import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { WeddingContent } from "../content/types";
import picnicBike from "../assets/decorations/picnic-bike.webp";

type ScheduleImage = NonNullable<
  WeddingContent["schedule"]["events"][number]["images"]
>[number];

type ScheduleSectionProps = {
  schedule: WeddingContent["schedule"];
};

export function ScheduleSection({ schedule }: ScheduleSectionProps) {
  const [selectedImage, setSelectedImage] = useState<ScheduleImage | null>(null);
  const [railPath, setRailPath] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useLayoutEffect(() => {
    const listElement = listRef.current;

    if (!listElement) {
      return;
    }
    const scheduleList = listElement;

    function updateRailPath() {
      const listRect = scheduleList.getBoundingClientRect();
      const rail = scheduleList.querySelector<SVGSVGElement>(".schedule-rail");
      const centerX = (rail?.clientWidth ?? 0) / 2;
      const centers = itemRefs.current
        .filter((item): item is HTMLElement => item !== null)
        .map((item) => {
          const itemRect = item.getBoundingClientRect();

          return itemRect.top - listRect.top + itemRect.height / 2;
        });

      setRailPath(createScheduleRailPath(centerX, listRect.height, centers));
    }

    updateRailPath();

    const resizeObserver = new ResizeObserver(updateRailPath);
    resizeObserver.observe(scheduleList);
    itemRefs.current.forEach((item) => {
      if (item) {
        resizeObserver.observe(item);
      }
    });
    window.addEventListener("resize", updateRailPath);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateRailPath);
    };
  }, [schedule.events.length, schedule.endingBlock]);

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
        <div className="schedule-list" ref={listRef}>
          <img
            className="section-decor section-decor--schedule"
            src={picnicBike}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <svg
            className="schedule-rail"
            aria-hidden="true"
          >
            <path
              className="schedule-rail__path"
              d={railPath}
            />
          </svg>

          {schedule.events.map((event, index) => (
            <article
              className="schedule-item"
              key={`${event.time}-${event.title}`}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
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
                      aria-label={schedule.imageOpenAriaLabel.replace("{alt}", image.alt)}
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
          {schedule.endingBlock ? (
            <article
              className="schedule-item schedule-item--ending"
              ref={(element) => {
                itemRefs.current[schedule.events.length] = element;
              }}
            >
              <div className="schedule-card">
                {schedule.endingBlock.time ? <time>{schedule.endingBlock.time}</time> : null}
                <div>
                  <h3>{schedule.endingBlock.title}</h3>
                  {schedule.endingBlock.body ? <p>{schedule.endingBlock.body}</p> : null}
                </div>
              </div>
            </article>
          ) : null}
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
            aria-label={schedule.imageCloseAriaLabel}
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

function createScheduleRailPath(centerX: number, height: number, centers: number[]) {
  if (centerX <= 0 || height <= 0) {
    return "";
  }

  if (centers.length === 0) {
    return `M ${centerX} 0 L ${centerX} ${height}`;
  }

  const points = [0, ...centers, height];
  const amplitude = Math.max(10, Math.min(centerX * 0.5, 24));
  const commands = [`M ${centerX} ${points[0]}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const startY = points[index];
    const endY = points[index + 1];
    const distance = endY - startY;
    const direction = index % 2 === 0 ? 1 : -1;
    const controlX = centerX + amplitude * direction;

    commands.push(
      `C ${controlX} ${startY + distance * 0.35} ${controlX} ${
        endY - distance * 0.35
      } ${centerX} ${endY}`,
    );
  }

  return commands.join(" ");
}
