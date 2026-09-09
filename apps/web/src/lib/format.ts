const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatCOP(amount: number): string {
  return COP_FORMATTER.format(amount);
}

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const PAD_LENGTH = 2;

export function formatRemaining(ms: number): string {
  if (ms <= 0) {
    return 'Ended';
  }
  const totalSeconds = Math.floor(ms / MILLISECONDS_PER_SECOND);
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}m ${seconds.toString().padStart(PAD_LENGTH, '0')}s`;
}

const MINUTES_PER_HOUR = 60;
const URGENT_THRESHOLD_MS = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

export interface TimeLeft {
  readonly label: string;
  readonly isUrgent: boolean;
}

/** Card-level time-remaining summary ("2h 14m left"), pure over a given `now`. */
export function formatTimeLeft(bidEndsAt: string | null, now: Date): TimeLeft {
  if (!bidEndsAt) {
    return { label: 'Not started', isUrgent: false };
  }

  const remainingMs = new Date(bidEndsAt).getTime() - now.getTime();
  if (remainingMs <= 0) {
    return { label: 'Ended', isUrgent: false };
  }

  const millisecondsPerMinute = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;
  const totalMinutes = Math.floor(remainingMs / millisecondsPerMinute);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) {
    return { label: `${minutes}m left`, isUrgent: remainingMs < URGENT_THRESHOLD_MS };
  }
  return { label: `${hours}h ${minutes}m left`, isUrgent: false };
}
