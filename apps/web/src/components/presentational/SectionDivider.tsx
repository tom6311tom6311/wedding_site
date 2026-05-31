export function SectionDivider() {
  return (
    <div className="section-divider" aria-hidden="true">
      <svg
        viewBox="0 0 420 54"
        role="img"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          className="section-divider__line section-divider__line--left"
          d="M28 27 C70 25 95 14 131 24 C157 31 173 31 193 20"
        />
        <path
          className="section-divider__line section-divider__line--right"
          d="M392 27 C350 25 325 14 289 24 C263 31 247 31 227 20"
        />
        <path
          className="section-divider__line"
          d="M193 20 C198 10 207 9 210 21 C213 9 222 10 227 20"
        />
        <path
          className="section-divider__line"
          d="M178 28 C189 42 203 38 210 29 C217 38 231 42 242 28"
        />
        <path
          className="section-divider__line"
          d="M48 28 C37 12 60 9 55 24 C52 33 38 35 31 28"
        />
        <path
          className="section-divider__line"
          d="M372 28 C383 12 360 9 365 24 C368 33 382 35 389 28"
        />
        <circle className="section-divider__dot" cx="158" cy="28" r="2.4" />
        <circle className="section-divider__dot" cx="262" cy="28" r="2.4" />
      </svg>
    </div>
  );
}
