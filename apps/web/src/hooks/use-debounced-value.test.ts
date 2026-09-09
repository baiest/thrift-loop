import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from './use-debounced-value.js';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300));
    expect(result.current).toBe('a');
  });

  it('does not update before the delay elapses', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    await act(() => vi.advanceTimersByTime(299));

    expect(result.current).toBe('a');
  });

  it('updates once the delay elapses', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    await act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe('ab');
  });

  it('resets the timer on rapid successive changes, keeping only the last value', async () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    await act(() => vi.advanceTimersByTime(200));
    rerender({ value: 'abc' });
    await act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe('a');

    await act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('abc');
  });
});
