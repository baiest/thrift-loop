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
});
