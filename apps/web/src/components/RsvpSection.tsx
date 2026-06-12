import { useEffect, useId, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type { WeddingContent } from "../content/types";
import mailbox from "../assets/decorations/mailbox.webp";
import ringPillow from "../assets/decorations/ring-pillow.webp";

type RsvpSectionProps = {
  rsvp: WeddingContent["rsvp"];
};

type RsvpStatus = {
  kind: "success" | "error";
  message: string;
};

type RsvpPayload = {
  name: string;
  email: string;
  phone: string;
  identity: string;
  attendance: string;
  ceremonyAttendance: string;
  guestCount: number;
  message: string;
};

type RsvpFormValues = {
  name: string;
  email: string;
  phone: string;
  identity: string;
  attendance: string;
  ceremonyAttendance: string;
  guests: string;
  message: string;
};

const guestCountOptions = Array.from({ length: 11 }, (_, index) => String(index));
const RSVP_API_BASE_URL =
  import.meta.env.VITE_RSVP_API_BASE_URL ?? "http://localhost:4000";
const RSVP_BROWSER_TOKEN_STORAGE_KEY = "wedding-site:rsvp-token";
const RSVP_TOKEN_UPDATED_EVENT = "wedding-site:rsvp-token-updated";

export function RsvpSection({ rsvp }: RsvpSectionProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [savedValues, setSavedValues] = useState<RsvpFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const currentValues = normalizeConditionalValues(toComparableValues(initialValues), rsvp);
  const savedComparableValues = savedValues
    ? normalizeConditionalValues(savedValues, rsvp)
    : null;
  const isAttending = isAttendingResponse(currentValues, rsvp);
  const visibleFields = rsvp.fields.filter((field) => {
    if (field.name === "ceremonyAttendance" || field.name === "guests") {
      return isAttending;
    }

    return true;
  });
  const hasSavedResponse = savedValues !== null;
  const hasUnsavedChanges =
    savedComparableValues !== null && !areFormValuesEqual(currentValues, savedComparableValues);
  const shouldDisableSubmit = isSubmitting || (hasSavedResponse && !hasUnsavedChanges);
  const submitLabel = isSubmitting
    ? rsvp.submittingLabel
    : hasSavedResponse
      ? rsvp.updateLabel
      : rsvp.submitLabel;

  useEffect(() => {
    let cancelled = false;

    async function loadStoredRsvp() {
      const browserToken = window.localStorage.getItem(RSVP_BROWSER_TOKEN_STORAGE_KEY);

      if (!browserToken) {
        return;
      }

      try {
        const response = await fetch(`${RSVP_API_BASE_URL}/api/rsvp/me`, {
          headers: {
            Authorization: `Bearer ${browserToken}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as RsvpApiResponse;

        if (!cancelled) {
          const nextValues = toFormValues(body.rsvp);

          setInitialValues(nextValues);
          setSavedValues(nextValues);
        }
      } catch {
        // Prefill is opportunistic; the form still works without it.
      }
    }

    function handleTokenUpdated() {
      void loadStoredRsvp();
    }

    void loadStoredRsvp();
    window.addEventListener(RSVP_TOKEN_UPDATED_EVENT, handleTokenUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(RSVP_TOKEN_UPDATED_EVENT, handleTokenUpdated);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const formData = new FormData(form);
      const payload = {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        identity: String(formData.get("identity") ?? ""),
        attendance: String(formData.get("attendance") ?? ""),
        ceremonyAttendance: isAttending ? String(formData.get("ceremonyAttendance") ?? "") : "",
        guestCount: isAttending ? Number(formData.get("guests") ?? 0) : 0,
        message: String(formData.get("message") ?? ""),
      };
      const validation = validateRsvpPayload(
        payload,
        isAttending,
        rsvp.validationMessages,
      );

      if (!validation.isValid) {
        setInvalidFields(validation.invalidFields);
        setStatus({
          kind: "error",
          message: validation.message,
        });
        return;
      }

      setInvalidFields(new Set());

      const browserToken = window.localStorage.getItem(RSVP_BROWSER_TOKEN_STORAGE_KEY);
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (browserToken) {
        headers.Authorization = `Bearer ${browserToken}`;
      }

      const response = await fetch(`${RSVP_API_BASE_URL}/api/rsvp`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 409) {
        setStatus({
          kind: "error",
          message: rsvp.statusMessages.duplicate,
        });
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to submit RSVP");
      }

      const body = (await response.json()) as RsvpApiResponse;
      const nextValues = toFormValues(body.rsvp);

      window.localStorage.setItem(RSVP_BROWSER_TOKEN_STORAGE_KEY, body.browserToken);
      window.dispatchEvent(new Event(RSVP_TOKEN_UPDATED_EVENT));
      setInitialValues(nextValues);
      setSavedValues(nextValues);
      setStatus({
        kind: "success",
        message: hasSavedResponse
          ? rsvp.statusMessages.updateSuccess
          : rsvp.statusMessages.submitSuccess,
      });
      window.requestAnimationFrame(() => scrollToPuzzleSection());
    } catch {
      setStatus({
        kind: "error",
        message: rsvp.statusMessages.submitError,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <form className="rsvp-form" ref={formRef} onSubmit={handleSubmit}>
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
            {visibleFields.map((field) => (
              <div className="rsvp-field" key={field.name}>
                <span className="rsvp-field__label">
                  {field.label}
                  {field.required ? (
                    <span className="rsvp-field__required" aria-label={rsvp.requiredAriaLabel}>
                      *
                    </span>
                  ) : null}
                </span>
                {field.name === "guests" ? (
                  <RsvpSelect
                    name={field.name}
                    options={guestCountOptions}
                    value={initialValues[field.name] ?? "0"}
                    required={field.required}
                    invalid={invalidFields.has(field.name)}
                    onChange={(value) =>
                      updateFieldValue(
                        field.name,
                        value,
                        setInitialValues,
                        setInvalidFields,
                        rsvp,
                      )
                    }
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    placeholder={field.placeholder}
                    rows={4}
                    required={field.required}
                    value={initialValues[field.name] ?? ""}
                    aria-invalid={invalidFields.has(field.name)}
                    onChange={(event) =>
                      updateFieldValue(
                        field.name,
                        event.target.value,
                        setInitialValues,
                        setInvalidFields,
                        rsvp,
                      )
                    }
                  />
                ) : field.type === "select" ? (
                  <RsvpSelect
                    name={field.name}
                    options={field.options ?? []}
                    placeholder={rsvp.selectPlaceholder}
                    value={initialValues[field.name] ?? ""}
                    required={field.required}
                    invalid={invalidFields.has(field.name)}
                    onChange={(value) =>
                      updateFieldValue(
                        field.name,
                        value,
                        setInitialValues,
                        setInvalidFields,
                        rsvp,
                      )
                    }
                  />
                ) : (
                  <input
                    name={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    required={field.required}
                    value={initialValues[field.name] ?? ""}
                    aria-invalid={invalidFields.has(field.name)}
                    inputMode={field.name === "phone" ? "tel" : undefined}
                    autoComplete={field.name === "phone" ? "tel" : undefined}
                    maxLength={field.name === "phone" ? 13 : undefined}
                    onChange={(event) =>
                      updateFieldValue(
                        field.name,
                        event.target.value,
                        setInitialValues,
                        setInvalidFields,
                        rsvp,
                      )
                    }
                  />
                )}
              </div>
            ))}
            <button type="submit" disabled={shouldDisableSubmit}>
              {submitLabel}
            </button>
            {status ? (
              <p className={`rsvp-status rsvp-status--${status.kind}`}>{status.message}</p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}

type RsvpSelectProps = {
  name: string;
  options: string[];
  value: string;
  placeholder?: string;
  required?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
};

function RsvpSelect({
  name,
  options,
  value,
  placeholder,
  required = false,
  invalid = false,
  onChange,
}: RsvpSelectProps) {
  const listboxId = useId();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
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
    onChange(option);
    setIsOpen(false);
  }

  return (
    <div
      className={`rsvp-select${isOpen ? " rsvp-select--open" : ""}${
        invalid ? " rsvp-select--invalid" : ""
      }`}
      ref={dropdownRef}
    >
      <input name={name} type="hidden" value={value} readOnly />
      <button
        className={`rsvp-select__trigger${value ? "" : " rsvp-select__trigger--placeholder"}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-required={required}
        aria-invalid={invalid}
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

type RsvpApiResponse = {
  browserToken: string;
  rsvp: {
    name: string;
    email: string;
    phone: string;
    identity: string;
    attendance: string;
    ceremonyAttendance: string;
    guestCount: number;
    message: string;
  };
};

function toFormValues(rsvp: RsvpApiResponse["rsvp"]) {
  return {
    name: rsvp.name,
    email: rsvp.email,
    phone: rsvp.phone,
    identity: rsvp.identity,
    attendance: rsvp.attendance,
    ceremonyAttendance: rsvp.ceremonyAttendance,
    guests: String(rsvp.guestCount),
    message: rsvp.message,
  };
}

function toComparableValues(values: Record<string, string>): RsvpFormValues {
  return {
    name: values.name ?? "",
    email: values.email ?? "",
    phone: values.phone ?? "",
    identity: values.identity ?? "",
    attendance: values.attendance ?? "",
    ceremonyAttendance: values.ceremonyAttendance ?? "",
    guests: values.guests ?? "0",
    message: values.message ?? "",
  };
}

function areFormValuesEqual(first: RsvpFormValues, second: RsvpFormValues) {
  return (
    first.name.trim() === second.name.trim() &&
    first.email.trim() === second.email.trim() &&
    first.phone.trim() === second.phone.trim() &&
    first.identity === second.identity &&
    first.attendance === second.attendance &&
    first.ceremonyAttendance === second.ceremonyAttendance &&
    first.guests === second.guests &&
    first.message.trim() === second.message.trim()
  );
}

function normalizeConditionalValues(values: RsvpFormValues, rsvp: WeddingContent["rsvp"]) {
  if (isAttendingResponse(values, rsvp)) {
    return values;
  }

  return {
    ...values,
    ceremonyAttendance: "",
    guests: "0",
  };
}

function isAttendingResponse(values: Pick<RsvpFormValues, "attendance">, rsvp: WeddingContent["rsvp"]) {
  return isAttendingValue(values.attendance, rsvp);
}

function isAttendingValue(value: string, rsvp: WeddingContent["rsvp"]) {
  const attendingOption = rsvp.fields.find((field) => field.name === "attendance")?.options?.[0];

  return Boolean(attendingOption && value === attendingOption);
}

function validateRsvpPayload(
  payload: RsvpPayload,
  isAttending: boolean,
  validationMessages: WeddingContent["rsvp"]["validationMessages"],
) {
  const invalidFields = new Set<string>();

  if (!payload.name.trim()) {
    invalidFields.add("name");
  }

  if (!isValidPhoneInput(payload.phone)) {
    invalidFields.add("phone");
  }

  if (payload.email.trim() && !isValidEmailInput(payload.email)) {
    invalidFields.add("email");
  }

  if (!payload.identity.trim()) {
    invalidFields.add("identity");
  }

  if (!payload.attendance.trim()) {
    invalidFields.add("attendance");
  }

  if (isAttending && !payload.ceremonyAttendance.trim()) {
    invalidFields.add("ceremonyAttendance");
  }

  if (
    isAttending &&
    (!Number.isInteger(payload.guestCount) || payload.guestCount < 0 || payload.guestCount > 10)
  ) {
    invalidFields.add("guests");
  }

  if (invalidFields.size === 0) {
    return {
      isValid: true,
      invalidFields,
      message: "",
    };
  }

  return {
    isValid: false,
    invalidFields,
    message: invalidFields.has("phone")
      ? validationMessages.phone
      : invalidFields.has("email")
        ? validationMessages.email
        : validationMessages.required,
  };
}

function isValidPhoneInput(input: string) {
  const compact = input.trim().replace(/[\s().-]/g, "");

  return /^09\d{8}$/.test(compact);
}

function isValidEmailInput(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

function scrollToPuzzleSection() {
  const puzzleSection = document.getElementById("puzzle");

  if (!puzzleSection) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const targetY = window.scrollY + puzzleSection.getBoundingClientRect().top;

  if (prefersReducedMotion) {
    window.scrollTo({ top: targetY });
    return;
  }

  animateScrollTo(targetY, 1600);
}

function animateScrollTo(targetY: number, durationMs: number) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = window.performance.now();

  function step(currentTime: number) {
    const progress = Math.min((currentTime - startTime) / durationMs, 1);
    const easedProgress = easeInOutCubic(progress);

    window.scrollTo({ top: startY + distance * easedProgress });

    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }

  window.requestAnimationFrame(step);
}

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function updateFieldValue(
  name: string,
  value: string,
  setValues: Dispatch<SetStateAction<Record<string, string>>>,
  setInvalidFields: Dispatch<SetStateAction<Set<string>>>,
  rsvp: WeddingContent["rsvp"],
) {
  setValues((current) => ({
    ...current,
    [name]: value,
    ...(name === "attendance" &&
    isAttendingValue(value, rsvp) &&
    (!current.guests || current.guests === "0")
      ? { guests: "1" }
      : null),
  }));
  setInvalidFields((current) => {
    if (!current.has(name) && !(name === "attendance" && current.has("guests"))) {
      return current;
    }

    const next = new Set(current);
    next.delete(name);

    if (name === "attendance" && isAttendingValue(value, rsvp)) {
      next.delete("guests");
    }

    return next;
  });
}
