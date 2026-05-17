import type { WeddingContent } from "../content/types";

type RsvpSectionProps = {
  rsvp: WeddingContent["rsvp"];
};

export function RsvpSection({ rsvp }: RsvpSectionProps) {
  return (
    <section className="page-section rsvp-section" id="rsvp">
      <div className="section-inner rsvp-layout">
        <div>
          <p className="section-eyebrow">{rsvp.eyebrow}</p>
          <h2>{rsvp.title}</h2>
          <p>{rsvp.body}</p>
        </div>
        <form className="rsvp-form" onSubmit={(event) => event.preventDefault()}>
          {rsvp.fields.map((field) => (
            <label key={field.name}>
              <span>{field.label}</span>
              {field.type === "textarea" ? (
                <textarea name={field.name} placeholder={field.placeholder} rows={4} />
              ) : field.type === "select" ? (
                <select name={field.name} defaultValue="">
                  <option value="" disabled>
                    Select an option
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
    </section>
  );
}
