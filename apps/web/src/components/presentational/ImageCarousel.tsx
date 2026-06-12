import type { HeroImage } from "../../content/types";

type ImageCarouselProps = {
  activeSlide: number;
  images: HeroImage[];
  onSelectSlide: (index: number) => void;
};

export function ImageCarousel({
  activeSlide,
  images,
  onSelectSlide,
}: ImageCarouselProps) {
  return (
    <>
      <div className="hero__carousel" aria-hidden="true">
        {images.map((image, index) => (
          <img
            className={`hero__image${index === activeSlide ? " hero__image--active" : ""}`}
            key={image.src}
            src={image.src}
            alt=""
            decoding={index === 0 ? "sync" : "async"}
            fetchPriority={index === 0 ? "high" : "auto"}
            loading={index < 3 ? "eager" : "lazy"}
            style={{ objectPosition: image.objectPosition }}
          />
        ))}
      </div>

      {images.length > 1 ? (
        <div className="hero__carousel-indicators" role="tablist" aria-label="Hero photos">
          {images.map((image, index) => (
            <button
              className={`hero__carousel-indicator${
                index === activeSlide ? " hero__carousel-indicator--active" : ""
              }`}
              key={image.src}
              type="button"
              role="tab"
              aria-label={`Show photo ${index + 1}`}
              aria-selected={index === activeSlide}
              onClick={() => onSelectSlide(index)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
