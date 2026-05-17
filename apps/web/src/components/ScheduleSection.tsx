import type { WeddingContent } from "../content/types";

type ScheduleSectionProps = {
  schedule: WeddingContent["schedule"];
};

export function ScheduleSection({ schedule }: ScheduleSectionProps) {
  return (
    <section className="page-section schedule-section" id="schedule">
      <div className="section-inner">
        <div className="section-heading">
          <p className="section-eyebrow">{schedule.eyebrow}</p>
          <h2>{schedule.title}</h2>
        </div>
        <div className="schedule-list">
          {schedule.events.map((event) => (
            <article className="schedule-item" key={`${event.time}-${event.title}`}>
              <time>{event.time}</time>
              <div>
                <h3>{event.title}</h3>
                <p>{event.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
