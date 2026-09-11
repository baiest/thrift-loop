import { useEffect, useRef, useState } from 'react';

const FLASH_DURATION_MS = 900;

/** True for a brief window right after `value` changes — never on the
 * initial mount. Live updates (a bid moving the price, a new row appearing
 * in the bid history) can otherwise flip a value so fast it's easy to miss;
 * pair the returned flag with a highlight class to draw the eye to it.
 * `durationMs` defaults to a quick highlight flash but can be extended for
 * callers that need the "just changed" window to last longer (e.g. holding
 * a celebration overlay open). */
export function useFlashOnChange<T>(value: T, durationMs: number = FLASH_DURATION_MS): boolean {
  const [flashing, setFlashing] = useState(false);
  const previousValue = useRef(value);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      previousValue.current = value;
      return;
    }
    if (value === previousValue.current) {
      return;
    }
    previousValue.current = value;
    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), durationMs);
    return () => clearTimeout(timer);
  }, [value, durationMs]);

  return flashing;
}
