import { useState } from 'react';
import { PhotoPlaceholder } from '../atoms/photo-placeholder.js';

export interface PhotoCarouselProps {
  readonly photoUrls: readonly string[];
  readonly category: string;
}

/** Auction detail hero image: cycles through every uploaded photo (not just
 * the first) via arrow buttons and dot indicators. Falls back to the shared
 * placeholder when there are no photos, or the current one fails to load. */
export function PhotoCarousel({ photoUrls, category }: PhotoCarouselProps): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  // index is clamped modulo photoUrls.length by goTo, never external input.
  // eslint-disable-next-line security/detect-object-injection
  const currentUrl = photoUrls[index];

  if (!currentUrl || currentUrl === failedUrl) {
    return <PhotoPlaceholder className="aspect-square" />;
  }

  function goTo(nextIndex: number): void {
    setFailedUrl(null);
    setIndex((nextIndex + photoUrls.length) % photoUrls.length);
  }

  return (
    <div className="relative">
      <img
        src={currentUrl}
        alt={category}
        onError={() => setFailedUrl(currentUrl)}
        className="aspect-square w-full rounded-lg object-cover"
      />
      {photoUrls.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-md hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photoUrls.map((url, dotIndex) => (
              <button
                key={url}
                type="button"
                aria-label={`Go to photo ${dotIndex + 1}`}
                aria-current={dotIndex === index}
                onClick={() => goTo(dotIndex)}
                className={`h-2 w-2 rounded-full ${
                  dotIndex === index ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
