import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { useFlashOnChange } from './use-flash-on-change.js';

describe('useFlashOnChange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is not flashing on the initial mount', () => {
    const { result } = renderHook(() => useFlashOnChange('a'));
    expect(result.current).toBe(false);
  });

  it('flashes briefly after the value changes', () => {
    const { result, rerender } = renderHook(({ value }) => useFlashOnChange(value), {
      initialProps: { value: 41_000 },
    });
    expect(result.current).toBe(false);

    rerender({ value: 75_000 });
    expect(result.current).toBe(true);
  });

  it('stops flashing once the highlight duration elapses', async () => {
    const { result, rerender } = renderHook(({ value }) => useFlashOnChange(value), {
      initialProps: { value: 41_000 },
    });

    rerender({ value: 75_000 });
    expect(result.current).toBe(true);

    await act(() => vi.advanceTimersByTime(1_000));

    expect(result.current).toBe(false);
  });

  it('does not flash when rerendered with the same value', () => {
    const { result, rerender } = renderHook(({ value }) => useFlashOnChange(value), {
      initialProps: { value: 41_000 },
    });

    rerender({ value: 41_000 });

    expect(result.current).toBe(false);
  });

  it('restarts the highlight window on a second change before the first one clears', async () => {
    const { result, rerender } = renderHook(({ value }) => useFlashOnChange(value), {
      initialProps: { value: 1 },
    });

    rerender({ value: 2 });
    await act(() => vi.advanceTimersByTime(500));
    rerender({ value: 3 });
    await act(() => vi.advanceTimersByTime(500));

    expect(result.current).toBe(true);

    await act(() => vi.advanceTimersByTime(500));

    expect(result.current).toBe(false);
  });
});
