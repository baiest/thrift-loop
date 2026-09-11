import { describe, expect, it } from 'vitest';
import { formatCOP, formatRelativeTime, formatRemaining, formatTimeLeft } from './format.js';

describe('formatCOP', () => {
  it('formats a whole number of pesos with the currency symbol', () => {
    expect(formatCOP(50_000)).toMatch(/\$\s?50\.000/);
  });

  it('formats zero', () => {
    expect(formatCOP(0)).toMatch(/\$\s?0/);
  });
});

describe('formatRemaining', () => {
  it('formats minutes and seconds', () => {
    const twoMinutes = 2 * 60 * 1000;
    expect(formatRemaining(twoMinutes)).toBe('2m 00s');
  });

  it('formats less than a minute', () => {
    expect(formatRemaining(45 * 1000)).toBe('0m 45s');
  });

  it('clamps negative remaining time to Ended', () => {
    expect(formatRemaining(-1000)).toBe('Ended');
  });

  it('shows Ended at exactly zero', () => {
    expect(formatRemaining(0)).toBe('Ended');
  });
});

describe('formatTimeLeft', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  it('returns null bidEndsAt as not urgent with a waiting label', () => {
    expect(formatTimeLeft(null, now)).toEqual({ label: 'Not started', isUrgent: false });
  });

  it('formats hours and minutes left', () => {
    const endsAt = new Date('2026-01-01T14:14:00.000Z').toISOString();
    expect(formatTimeLeft(endsAt, now)).toEqual({ label: '2h 14m left', isUrgent: false });
  });

  it('formats minutes only when under an hour', () => {
    const endsAt = new Date('2026-01-01T12:48:00.000Z').toISOString();
    expect(formatTimeLeft(endsAt, now)).toEqual({ label: '48m left', isUrgent: true });
  });

  it('is not urgent at exactly one hour left', () => {
    const endsAt = new Date('2026-01-01T13:00:00.000Z').toISOString();
    expect(formatTimeLeft(endsAt, now)).toEqual({ label: '1h 0m left', isUrgent: false });
  });

  it('shows Ended once bidEndsAt has passed', () => {
    const endsAt = new Date('2026-01-01T11:59:00.000Z').toISOString();
    expect(formatTimeLeft(endsAt, now)).toEqual({ label: 'Ended', isUrgent: false });
  });

  it('shows Ended exactly at bidEndsAt', () => {
    expect(formatTimeLeft(now.toISOString(), now)).toEqual({ label: 'Ended', isUrgent: false });
  });

  it('shows Ended when already sold, even if bidEndsAt is still in the future', () => {
    const futureEndsAt = new Date('2026-01-01T14:00:00.000Z').toISOString();
    expect(formatTimeLeft(futureEndsAt, now, true)).toEqual({ label: 'Ended', isUrgent: false });
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  it('shows seconds as "just now"', () => {
    const ts = new Date('2026-01-01T11:59:40.000Z').toISOString();
    expect(formatRelativeTime(ts, now)).toBe('just now');
  });

  it('shows whole minutes', () => {
    const ts = new Date('2026-01-01T11:58:00.000Z').toISOString();
    expect(formatRelativeTime(ts, now)).toBe('2m ago');
  });

  it('shows whole hours', () => {
    const ts = new Date('2026-01-01T09:30:00.000Z').toISOString();
    expect(formatRelativeTime(ts, now)).toBe('2h ago');
  });

  it('shows "Yesterday" between 24h and 48h ago', () => {
    const ts = new Date('2025-12-31T00:00:00.000Z').toISOString();
    expect(formatRelativeTime(ts, now)).toBe('Yesterday');
  });

  it('shows whole days beyond 48h', () => {
    const ts = new Date('2025-12-28T12:00:00.000Z').toISOString();
    expect(formatRelativeTime(ts, now)).toBe('4d ago');
  });
});
