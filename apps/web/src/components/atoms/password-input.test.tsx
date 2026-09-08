import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './password-input.js';

describe('PasswordInput', () => {
  it('renders as a password field by default', () => {
    render(<PasswordInput id="password" value="secret" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Show password')).toBeInTheDocument();
  });

  it('toggles visibility when the eye button is clicked', async () => {
    render(<PasswordInput id="password" value="secret" onChange={vi.fn()} />);
    const input = document.getElementById('password') as HTMLInputElement;

    expect(input.type).toBe('password');

    await userEvent.click(screen.getByLabelText('Show password'));
    expect(input.type).toBe('text');

    await userEvent.click(screen.getByLabelText('Hide password'));
    expect(input.type).toBe('password');
  });

  it('calls onChange as the user types', async () => {
    const onChange = vi.fn();
    render(<PasswordInput id="password" value="" onChange={onChange} />);

    await userEvent.type(document.getElementById('password') as HTMLInputElement, 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });
});
