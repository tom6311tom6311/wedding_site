import type { WeddingContent } from "../content/types";
import mailbox from "../assets/decorations/mailbox.png";
import ringPillow from "../assets/decorations/ring-pillow.png";

type RsvpSectionProps = {
  rsvp: WeddingContent["rsvp"];
};

export function RsvpSection({ rsvp }: RsvpSectionProps) {
  return (
    <section className="page-section rsvp-section" id="rsvp">
      <div className="section-inner rsvp-inner">
        <div className="section-heading">
          <h2>{rsvp.title}</h2>
          {rsvp.subtitle ? (
            <p className="section-subtitle">{rsvp.subtitle}</p>
          ) : null}
        </div>
        <div className="rsvp-layout">
          <form className="rsvp-form" onSubmit={(event) => event.preventDefault()}>
            <img
              className="section-decor section-decor--rsvp-ring"
              src={ringPillow}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
            <img
              className="section-decor section-decor--rsvp-mail"
              src={mailbox}
              alt=""
              aria-hidden="true"
              loading="lazy"
            />
            {rsvp.fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea name={field.name} placeholder={field.placeholder} rows={4} />
                ) : field.type === "select" ? (
                  <select name={field.name} defaultValue="">
                    <option value="" disabled>
                      請選擇
                    </option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                  />
                )}
              </label>
            ))}
            <button type="submit">{rsvp.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
}
