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
