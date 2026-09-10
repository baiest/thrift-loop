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

const JUST_NOW_THRESHOLD_MS = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const HOURS_PER_DAY = 24;
const DAYS_PER_YESTERDAY_WINDOW = 2;
const YESTERDAY_THRESHOLD_MS =
  DAYS_PER_YESTERDAY_WINDOW *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND;

/** A short relative timestamp for a notification ("2m ago", "3h ago",
 * "Yesterday", "4d ago") — pure over a given `now`, matching formatTimeLeft's
 * pattern of accepting the caller's clock rather than reading Date.now(). */
export function formatRelativeTime(iso: string, now: Date): string {
  const elapsedMs = now.getTime() - new Date(iso).getTime();
  if (elapsedMs < JUST_NOW_THRESHOLD_MS) {
    return 'just now';
  }

  const millisecondsPerMinute = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;
  const millisecondsPerHour = millisecondsPerMinute * MINUTES_PER_HOUR;
  const millisecondsPerDay = millisecondsPerHour * HOURS_PER_DAY;

  if (elapsedMs < millisecondsPerHour) {
    return `${Math.floor(elapsedMs / millisecondsPerMinute)}m ago`;
  }
  if (elapsedMs < millisecondsPerDay) {
    return `${Math.floor(elapsedMs / millisecondsPerHour)}h ago`;
  }
  if (elapsedMs < YESTERDAY_THRESHOLD_MS) {
    return 'Yesterday';
  }
  return `${Math.floor(elapsedMs / millisecondsPerDay)}d ago`;
}
