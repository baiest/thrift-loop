import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './toggle.js';

describe('Toggle', () => {
  it('renders as an accessible switch reflecting the checked state', () => {
    render(<Toggle id="outbid" checked={true} onChange={vi.fn()} label="Outbid" />);
    expect(screen.getByRole('switch', { name: 'Outbid' })).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects an unchecked state', () => {
    render(<Toggle id="outbid" checked={false} onChange={vi.fn()} label="Outbid" />);
    expect(screen.getByRole('switch', { name: 'Outbid' })).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the flipped value when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle id="outbid" checked={false} onChange={onChange} label="Outbid" />);

    await user.click(screen.getByRole('switch', { name: 'Outbid' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not respond when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle id="outbid" checked={false} onChange={onChange} label="Outbid" disabled />);

    await user.click(screen.getByRole('switch', { name: 'Outbid' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('pins the thumb to an explicit left offset instead of relying on the browser own centering of button content', () => {
    // Regression: Chromium centers a <button>'s content by default, which
    // corrupts the "auto" static position an absolutely-positioned child (the
    // thumb) resolves to. Without an explicit `left-*` class the thumb renders
    // detached from its track, mostly outside it, looking broken. Also needs
    // appearance-none so the native button chrome doesn't paint over the
    // custom rounded background.
    render(<Toggle id="outbid" checked={false} onChange={vi.fn()} label="Outbid" />);
    const track = screen.getByRole('switch', { name: 'Outbid' });
    const thumb = track.querySelector('span');

    expect(track).toHaveClass('appearance-none');
    expect(thumb).toHaveClass('left-0.5');
  });
});
