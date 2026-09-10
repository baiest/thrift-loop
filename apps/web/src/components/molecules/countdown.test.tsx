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

  it('keeps ticking on schedule when the parent re-renders with a new onExpire reference', async () => {
    // Regression: a parent passing an inline `onExpire={() => ...}` creates a new
    // function every render. If Countdown's effect depended on it directly, every
    // parent re-render would tear down and restart the interval, delaying the next
    // tick and making the displayed time visibly stall/flicker instead of ticking
    // down every second on a stable schedule.
    function Wrapper({ tick }: { readonly tick: number }): React.JSX.Element {
      return (
        <div>
          <span data-testid="tick">{tick}</span>
          <Countdown endsAt="2026-01-01T00:02:00.000Z" onExpire={() => {}} />
        </div>
      );
    }

    const { rerender } = render(<Wrapper tick={0} />);

    // Re-render mid-tick (before the first scheduled 1s tick at t=1000ms).
    await vi.advanceTimersByTimeAsync(500);
    rerender(<Wrapper tick={1} />);
    // Total elapsed just under 2000ms: on the original once-per-second schedule
    // from mount, the tick at t=1000ms has fired (showing "1m 59s") but the one
    // at t=2000ms has not yet. A restarted interval (reset at t=500ms) would
    // instead have already ticked at t=1500ms, jumping straight to "1m 58s".
    await vi.advanceTimersByTimeAsync(1499);

    expect(screen.getByText('1m 59s')).toBeInTheDocument();
  });

  it('cleans up its interval on unmount', () => {
    const { unmount } = render(<Countdown endsAt="2026-01-01T00:02:00.000Z" />);
    unmount();

    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});
