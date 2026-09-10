import { useEffect, useRef, useState } from 'react';

const FLASH_DURATION_MS = 900;

/** True for a brief window right after `value` changes — never on the
 * initial mount. Live updates (a bid moving the price, a new row appearing
 * in the bid history) can otherwise flip a value so fast it's easy to miss;
 * pair the returned flag with a highlight class to draw the eye to it. */
export function useFlashOnChange<T>(value: T): boolean {
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
    const timer = setTimeout(() => setFlashing(false), FLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [value]);

  return flashing;
}
