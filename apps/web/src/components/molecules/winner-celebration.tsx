import { useMemo } from 'react';

const CONFETTI_COUNT = 40;
const CONFETTI_COLORS = [
  'var(--color-brand-500)',
  'var(--color-sage-ink)',
  'var(--color-amber-ink)',
  '#d4af37',
  '#4a90d9',
];
const PERCENT = 100;
const MAX_DRIFT_PX = 120;
const DRIFT_CENTERING = 0.5;
const DRIFT_SPREAD = 2;
const MIN_SPIN_DEG = 360;
const SPIN_RANGE_DEG = 360;
const MIN_DURATION_S = 2.2;
const DURATION_RANGE_S = 1.2;
const MAX_DELAY_S = 0.6;

interface ConfettiPiece {
  readonly left: string;
  readonly color: string;
  readonly drift: string;
  readonly spin: string;
  readonly duration: string;
  readonly delay: string;
}

function randomPiece(): ConfettiPiece {
  // Varies each confetti piece's position/color/motion for a natural-looking
  // spread; purely cosmetic, not security-sensitive.
  /* eslint-disable sonarjs/pseudo-random */
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  return {
    left: `${Math.random() * PERCENT}%`,
    color: color ?? CONFETTI_COLORS[0]!,
    drift: `${(Math.random() - DRIFT_CENTERING) * DRIFT_SPREAD * MAX_DRIFT_PX}px`,
    spin: `${MIN_SPIN_DEG + Math.random() * SPIN_RANGE_DEG}deg`,
    duration: `${MIN_DURATION_S + Math.random() * DURATION_RANGE_S}s`,
    delay: `${Math.random() * MAX_DELAY_S}s`,
  };
  /* eslint-enable sonarjs/pseudo-random */
}

/** A one-shot confetti celebration, mounted by the caller when a viewer
 * learns — live — that they just won an auction. Purely decorative: no
 * interaction, doesn't block clicks on what's underneath. */
export function WinnerCelebration(): React.JSX.Element {
  const pieces = useMemo(() => Array.from({ length: CONFETTI_COUNT }, randomPiece), []);

  return (
    <div
      data-testid="winner-celebration"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="animate-confetti-fall absolute top-0 h-3 w-1.5 rounded-sm"
          style={{
            left: piece.left,
            backgroundColor: piece.color,
            animationDuration: piece.duration,
            animationDelay: piece.delay,
            // @ts-expect-error -- custom properties aren't in CSSProperties
            '--drift': piece.drift,
            '--spin': piece.spin,
          }}
        />
      ))}
    </div>
  );
}
