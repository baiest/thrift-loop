import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Countdown } from './countdown.js';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Waiting for first bid" when there is no end time yet', () => {
    render(<Countdown endsAt={null} />);
    expect(screen.getByText('Waiting for first bid')).toBeInTheDocument();
  });

  it('shows the remaining time', () => {
    render(<Countdown endsAt="2026-01-01T00:02:00.000Z" />);
    expect(screen.getByText('2m 00s')).toBeInTheDocument();
  });

  it('ticks down every second', async () => {
    render(<Countdown endsAt="2026-01-01T00:02:00.000Z" />);

    await vi.advanceTimersByTimeAsync(1000);

    expect(screen.getByText('1m 59s')).toBeInTheDocument();
  });

  it('shows Ended once the time is up and calls onExpire', async () => {
    const onExpire = vi.fn();
    render(<Countdown endsAt="2026-01-01T00:00:01.000Z" onExpire={onExpire} />);

    await vi.advanceTimersByTimeAsync(1000);

    expect(screen.getByText('Ended')).toBeInTheDocument();
    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('corrects for server/client clock drift via serverOffsetMs', () => {
    // Client clock is 5s ahead of the server; without the offset this would
    // already read "1m 55s" instead of the true "2m 00s".
    render(<Countdown endsAt="2026-01-01T00:02:05.000Z" serverOffsetMs={-5000} />);
    expect(screen.getByText('2m 00s')).toBeInTheDocument();
  });

  it('cleans up its interval on unmount', () => {
    const { unmount } = render(<Countdown endsAt="2026-01-01T00:02:00.000Z" />);
    unmount();

    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});
