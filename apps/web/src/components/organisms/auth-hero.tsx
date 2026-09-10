import { Badge } from '../atoms/badge.js';
import { PhotoPlaceholder } from '../atoms/photo-placeholder.js';

export interface AuthHeroProps {
  readonly headline: string;
  readonly subtext: string;
}

const AUCTION_CHIPS: readonly { label: string; rotate: string }[] = [
  { label: 'Live', rotate: '-rotate-6' },
  { label: 'New bid', rotate: 'rotate-3' },
  { label: 'Ending soon', rotate: '-rotate-3' },
];

/**
 * Shared hero panel for the login and register screens: a warm terracotta
 * moment that sells "curated live auctions" before the visitor ever sees a
 * form field. The card collage is decorative only — aria-hidden so
 * assistive tech goes straight to the real heading below it.
 *
 * Mobile: a top banner the form card overlaps. Desktop (lg+): a full-height
 * left panel, so the screen reads as a real two-column layout instead of a
 * narrow mobile column stranded in the middle of a wide viewport.
 */
export function AuthHero({ headline, subtext }: AuthHeroProps): React.JSX.Element {
  return (
    <div className="relative flex shrink-0 items-center overflow-hidden rounded-b-3xl bg-gradient-to-br from-brand-600 to-brand-500 px-6 pb-14 pt-10 text-white lg:sticky lg:top-0 lg:h-screen lg:w-1/2 lg:self-start lg:rounded-b-none lg:px-16 lg:py-16">
      <div className="lg:max-w-md">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-100">
          Thrift Loop
        </p>
        <h2 className="mb-2 font-display text-3xl font-bold leading-tight lg:text-5xl">
          {headline}
        </h2>
        <p className="mb-6 max-w-xs text-sm text-brand-50 lg:max-w-sm lg:text-base">{subtext}</p>

        <div aria-hidden="true" className="flex items-end gap-3 lg:gap-5">
          {AUCTION_CHIPS.map((chip) => (
            <div
              key={chip.label}
              className={`w-20 rounded-xl bg-white/95 p-1.5 shadow-lg lg:w-28 lg:rounded-2xl lg:p-2 ${chip.rotate}`}
            >
              <PhotoPlaceholder className="aspect-square" />
              <div className="mt-1 flex justify-center lg:mt-2">
                <Badge tone="live">{chip.label}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
