import { useEffect, useId, useRef, useState } from "react";
import type { WeddingContent } from "../content/types";
import mailbox from "../assets/decorations/mailbox.png";
import ringPillow from "../assets/decorations/ring-pillow.png";

type RsvpSectionProps = {
  rsvp: WeddingContent["rsvp"];
};

const guestCountOptions = Array.from({ length: 11 }, (_, index) => String(index));

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
              <div className="rsvp-field" key={field.name}>
                <span className="rsvp-field__label">{field.label}</span>
                {field.name === "guests" ? (
                  <RsvpSelect
                    name={field.name}
                    options={guestCountOptions}
                    defaultValue="0"
                  />
                ) : field.type === "textarea" ? (
                  <textarea name={field.name} placeholder={field.placeholder} rows={4} />
                ) : field.type === "select" ? (
                  <RsvpSelect
                    name={field.name}
                    options={field.options ?? []}
                    placeholder="請選擇"
                  />
                ) : (
                  <input
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
            <button type="submit">{rsvp.submitLabel}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

type RsvpSelectProps = {
  name: string;
  options: string[];
  defaultValue?: string;
  placeholder?: string;
};

function RsvpSelect({ name, options, defaultValue = "", placeholder }: RsvpSelectProps) {
  const listboxId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const selectedLabel = value || placeholder || "";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function chooseOption(option: string) {
    setValue(option);
    setIsOpen(false);
  }

  return (
    <div className={`rsvp-select${isOpen ? " rsvp-select--open" : ""}`} ref={dropdownRef}>
      <input name={name} type="hidden" value={value} />
      <button
        className={`rsvp-select__trigger${value ? "" : " rsvp-select__trigger--placeholder"}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedLabel}</span>
        <span className="rsvp-select__chevron" aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="rsvp-select__menu" id={listboxId} role="listbox">
          {options.map((option) => (
            <button
              className={`rsvp-select__option${option === value ? " rsvp-select__option--selected" : ""}`}
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => chooseOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
