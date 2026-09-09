import { describe, expect, it } from 'vitest';
import { isDateSelectable, isHourSelectable } from './date-slots.js';

const now = new Date(2026, 2, 15, 14, 30); // 2026-03-15 14:30 local time

describe('isDateSelectable', () => {
  it('rejects a date before today', () => {
    expect(isDateSelectable(new Date(2026, 2, 14), now)).toBe(false);
  });

  it('accepts today', () => {
    expect(isDateSelectable(new Date(2026, 2, 15), now)).toBe(true);
  });

  it('accepts a future date', () => {
    expect(isDateSelectable(new Date(2026, 2, 20), now)).toBe(true);
  });
});

describe('isHourSelectable', () => {
  it('rejects an hour already passed today', () => {
    expect(isHourSelectable(new Date(2026, 2, 15), 10, now)).toBe(false);
  });

  it('accepts an hour later today', () => {
    expect(isHourSelectable(new Date(2026, 2, 15), 16, now)).toBe(true);
  });

  it('rejects the current hour today (too soon to schedule)', () => {
    expect(isHourSelectable(new Date(2026, 2, 15), 14, now)).toBe(false);
  });

  it('accepts any hour on a future date', () => {
    expect(isHourSelectable(new Date(2026, 2, 16), 0, now)).toBe(true);
  });

  it('rejects every hour on a past date', () => {
    expect(isHourSelectable(new Date(2026, 2, 14), 23, now)).toBe(false);
  });
});
