import type { WeddingContent } from "../content/types";
import lemonDrinks from "../assets/decorations/lemon-drinks.png";

type DetailsSectionProps = {
  venue: WeddingContent["venue"];
};

export function DetailsSection({ venue }: DetailsSectionProps) {
  const mapQuery = encodeURIComponent(`${venue.name} ${venue.address}`);
  const mapEmbedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;
  const mapAriaLabel = venue.mapAriaLabel.replace("{name}", venue.name);

  return (
    <section className="page-section details-section" id="details">
      <div className="section-inner details-inner">
        <div className="section-heading details-heading">
          <h2>{venue.title}</h2>
        </div>

        <div className="details-grid">
          <article className="detail-panel details-copy">
            <img
              className="section-decor section-decor--details"
              src={lemonDrinks}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
            <div>
              <h3>{venue.name}</h3>
              <p>{venue.address}</p>
              <ul>
                {venue.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <div className="directions-list">
              {venue.directions.map((item) => (
                <div key={item.title}>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="detail-map-panel" aria-label={mapAriaLabel}>
            <iframe
              src={mapEmbedUrl}
              title={mapAriaLabel}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              className="detail-map-link"
              href={venue.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              {venue.mapLabel}
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
