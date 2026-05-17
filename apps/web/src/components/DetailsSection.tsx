import type { WeddingContent } from "../content/types";

type DetailsSectionProps = {
  venue: WeddingContent["venue"];
  travel: WeddingContent["travel"];
};

export function DetailsSection({ venue, travel }: DetailsSectionProps) {
  return (
    <section className="page-section details-section" id="details">
      <div className="section-inner details-grid">
        <article className="detail-panel">
          <p className="section-eyebrow">{venue.eyebrow}</p>
          <h2>{venue.title}</h2>
          <h3>{venue.name}</h3>
          <p>{venue.address}</p>
          <ul>
            {venue.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <a className="text-link" href={venue.mapUrl}>
            Open Map
          </a>
        </article>

        <article className="detail-panel">
          <p className="section-eyebrow">{travel.eyebrow}</p>
          <h2>{travel.title}</h2>
          <div className="travel-list">
            {travel.items.map((item) => (
              <div key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
