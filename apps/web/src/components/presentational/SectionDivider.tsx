import divider1 from "../../assets/dividers/divider-1.png";
import divider2 from "../../assets/dividers/divider-2.png";
import divider3 from "../../assets/dividers/divider-3.png";
import divider4 from "../../assets/dividers/divider-4.png";
import divider5 from "../../assets/dividers/divider-5.png";
import divider6 from "../../assets/dividers/divider-6.png";

const sectionDividerImages = [
  divider1,
  divider2,
  divider3,
  divider4,
  divider5,
  divider6,
];

type SectionDividerProps = {
  variant?: number;
  footer?: boolean;
};

export function SectionDivider({ variant = 0, footer = false }: SectionDividerProps) {
  const src = sectionDividerImages[variant % sectionDividerImages.length];

  return (
    <div
      className={`section-divider${footer ? " section-divider--footer" : ""}`}
      aria-hidden="true"
    >
      <div className="section-divider__art">
        <img className="section-divider__image" src={src} alt="" loading="lazy" />
      </div>
    </div>
  );
}
