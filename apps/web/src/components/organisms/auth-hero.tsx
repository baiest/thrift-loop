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
 */
export function AuthHero({ headline, subtext }: AuthHeroProps): React.JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-brand-600 to-brand-500 px-6 pb-14 pt-10 text-white">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-100">
        Thrift Loop
      </p>
      <h2 className="mb-2 font-display text-3xl font-bold leading-tight">{headline}</h2>
      <p className="mb-6 max-w-xs text-sm text-brand-50">{subtext}</p>

      <div aria-hidden="true" className="flex items-end gap-3">
        {AUCTION_CHIPS.map((chip) => (
          <div
            key={chip.label}
            className={`w-20 rounded-xl bg-white/95 p-1.5 shadow-lg ${chip.rotate}`}
          >
            <PhotoPlaceholder className="aspect-square" />
            <div className="mt-1 flex justify-center">
              <Badge tone="live">{chip.label}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
