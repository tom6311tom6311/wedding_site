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
  const activeImage = images[activeSlide];

  return (
    <>
      <div className="hero__carousel" aria-hidden="true">
        {activeImage ? (
          <img
            className="hero__image hero__image--active"
            key={activeImage.src}
            src={activeImage.src}
            alt=""
            decoding={activeSlide === 0 ? "sync" : "async"}
            fetchPriority={activeSlide === 0 ? "high" : "auto"}
            loading={activeSlide === 0 ? "eager" : "lazy"}
            style={{ objectPosition: activeImage.objectPosition }}
          />
        ) : null}
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
