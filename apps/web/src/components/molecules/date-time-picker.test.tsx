import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from './date-time-picker.js';

const now = new Date(2026, 2, 15, 14, 30); // 2026-03-15 14:30 local time

describe('DateTimePicker', () => {
  it('disables a date before today', () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);
    expect(screen.getByRole('button', { name: '14' })).toBeDisabled();
  });

  it('enables today and future dates', () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);
    expect(screen.getByRole('button', { name: '15' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '20' })).toBeEnabled();
  });

  it('disables an hour already passed today once that date is selected', async () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);

    await userEvent.click(screen.getByRole('button', { name: '15' }));

    expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '16:00' })).toBeEnabled();
  });

  it('calls onChange with an ISO string when an enabled slot is picked', async () => {
    const onChange = vi.fn();
    render(<DateTimePicker value={null} onChange={onChange} now={now} />);

    await userEvent.click(screen.getByRole('button', { name: '15' }));
    await userEvent.click(screen.getByRole('button', { name: '16:00' }));

    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 15, 16, 0).toISOString());
  });

  it('never calls onChange for a disabled slot', async () => {
    const onChange = vi.fn();
    render(<DateTimePicker value={null} onChange={onChange} now={now} />);

    await userEvent.click(screen.getByRole('button', { name: '14' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the current month and year as a header', () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('disables navigating to the previous month from the current month', () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);
    expect(screen.getByRole('button', { name: /previous month/i })).toBeDisabled();
  });

  it('navigates to the next month and shows its dates as selectable', async () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);

    await userEvent.click(screen.getByRole('button', { name: /next month/i }));

    expect(screen.getByText('April 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '5' })).toBeEnabled();
  });

  it('re-enables the previous month button after navigating forward', async () => {
    render(<DateTimePicker value={null} onChange={vi.fn()} now={now} />);

    await userEvent.click(screen.getByRole('button', { name: /next month/i }));

    expect(screen.getByRole('button', { name: /previous month/i })).toBeEnabled();
  });
});
