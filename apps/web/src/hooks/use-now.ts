import { useEffect, useState } from 'react';

const TICK_MS = 60_000;

/** The current time, refreshed once a minute — enough resolution for a countdown label. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return now;
}
