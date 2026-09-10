import { useEffect, useRef, useState } from 'react';
import { formatRemaining } from '../../lib/format.js';

export interface CountdownProps {
  readonly endsAt: string | null;
  readonly serverOffsetMs?: number;
  readonly onExpire?: () => void;
}

const TICK_MS = 1000;

function computeRemaining(endsAt: string, serverOffsetMs: number): number {
  return new Date(endsAt).getTime() - (Date.now() - serverOffsetMs);
}

export function Countdown({
  endsAt,
  serverOffsetMs = 0,
  onExpire,
}: CountdownProps): React.JSX.Element {
  const [remaining, setRemaining] = useState(() =>
    endsAt ? computeRemaining(endsAt, serverOffsetMs) : 0,
  );
  // A parent passing an inline `onExpire={() => ...}` creates a new function
  // every render; reading it via a ref (kept fresh below) instead of listing it
  // as an effect dependency keeps the interval on its original schedule instead
  // of being torn down and restarted on every unrelated parent re-render.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!endsAt) {
      return;
    }
    setRemaining(computeRemaining(endsAt, serverOffsetMs));

    const interval = setInterval(() => {
      const next = computeRemaining(endsAt, serverOffsetMs);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        onExpireRef.current?.();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [endsAt, serverOffsetMs]);

  if (!endsAt) {
    return <span className="text-sm text-ink-soft">Waiting for first bid</span>;
  }

  return <span className="text-sm font-medium text-ink">{formatRemaining(remaining)}</span>;
}
