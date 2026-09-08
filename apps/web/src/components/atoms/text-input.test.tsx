import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from './text-input.js';

describe('TextInput', () => {
  it('renders the given value', () => {
    render(<TextInput id="phone" value="300" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('300');
  });

  it('calls onChange with the new value as the user types', async () => {
    const onChange = vi.fn();
    render(<TextInput id="phone" value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onBlur when the input loses focus', async () => {
    const onBlur = vi.fn();
    render(<TextInput id="phone" value="" onChange={vi.fn()} onBlur={onBlur} />);

    const input = screen.getByRole('textbox');
    input.focus();
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('marks the input as invalid via aria-invalid', () => {
    render(<TextInput id="phone" value="" onChange={vi.fn()} invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
