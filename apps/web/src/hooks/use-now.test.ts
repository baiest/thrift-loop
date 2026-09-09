import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNow } from './use-now.js';

const TICK_MS = 60_000;

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current time immediately', () => {
    const { result } = renderHook(() => useNow());
    expect(result.current).toEqual(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('updates after a minute elapses', () => {
    const { result } = renderHook(() => useNow());

    act(() => {
      vi.advanceTimersByTime(TICK_MS);
    });

    expect(result.current).toEqual(new Date('2026-01-01T00:01:00.000Z'));
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useNow());

    unmount();

    expect(clearSpy).toHaveBeenCalled();
  });
});
