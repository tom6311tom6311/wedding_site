import { useEffect, useMemo, useState } from "react";
import type { WeddingContent } from "../content/types";

type CountdownSectionProps = {
  countdown: WeddingContent["countdown"];
};

type TimeRemaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
};

export function CountdownSection({ countdown }: CountdownSectionProps) {
  const targetTime = useMemo(
    () => new Date(countdown.targetDate).getTime(),
    [countdown.targetDate],
  );
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemaining(targetTime),
  );

  useEffect(() => {
    setTimeRemaining(getTimeRemaining(targetTime));

    const timer = window.setInterval(() => {
      setTimeRemaining(getTimeRemaining(targetTime));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetTime]);

  const units = [
    {
      label: countdown.units.days,
      value: timeRemaining.days,
    },
    {
      label: countdown.units.hours,
      value: timeRemaining.hours,
    },
    {
      label: countdown.units.minutes,
      value: timeRemaining.minutes,
    },
    {
      label: countdown.units.seconds,
      value: timeRemaining.seconds,
    },
  ];

  return (
    <section className="page-section countdown-section" id="countdown">
      <img
        className="countdown-decor countdown-decor--branch"
        src="/images/decorations.local/countdown-branch.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
      <img
        className="countdown-decor countdown-decor--picnic"
        src="/images/decorations.local/countdown-picnic.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />
      <div className="section-inner countdown-inner">
        <div className="countdown-copy">
          {countdown.eyebrow ? (
            <p className="section-eyebrow">{countdown.eyebrow}</p>
          ) : null}
          <h2>{countdown.title}</h2>
          <p>{countdown.subtitle}</p>
        </div>
        <div className="countdown-display" aria-live="polite">
          {timeRemaining.isComplete ? (
            <strong className="countdown-complete">{countdown.completedLabel}</strong>
          ) : (
            units.map((unit) => (
              <div className="countdown-unit" key={unit.label}>
                <strong>{formatCountdownValue(unit.value)}</strong>
                <span>{unit.label}</span>
              </div>
            ))
          )}
        </div>
        <p className="countdown-date">{countdown.dateLine}</p>
      </div>
    </section>
  );
}

function getTimeRemaining(targetTime: number): TimeRemaining {
  const remainingMs = Number.isFinite(targetTime)
    ? Math.max(targetTime - Date.now(), 0)
    : 0;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isComplete: remainingMs === 0,
  };
}

function formatCountdownValue(value: number) {
  return String(value).padStart(2, "0");
}
