import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { ApiError, login } from '../../lib/api-client.js';

vi.mock('../../lib/api-client.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../lib/api-client.js')>('../../lib/api-client.js');
  return { ...actual, login: vi.fn() };
});

const validUser = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
};

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error when submitted empty', async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(login).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your phone number and password/i);
  });

  it('logs in, stores the user, and calls onSuccess', async () => {
    vi.mocked(login).mockResolvedValue(validUser);
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText('Phone number'), '3001234567');
    await userEvent.type(document.getElementById('password') as HTMLInputElement, 'Abcdefg1');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(useAuthStore.getState().user).toEqual(validUser);
  });

  it('shows the generic server error for wrong credentials', async () => {
    vi.mocked(login).mockRejectedValue(new ApiError('Phone number or password is incorrect', 401));
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Phone number'), '3001234567');
    await userEvent.type(document.getElementById('password') as HTMLInputElement, 'WrongPass1');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() =>
      expect(screen.getByText('Phone number or password is incorrect')).toBeInTheDocument(),
    );
  });
});
