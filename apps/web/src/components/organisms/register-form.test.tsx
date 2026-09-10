import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from './register-form.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { ApiError, register } from '../../lib/api-client.js';

vi.mock('../../lib/api-client.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../lib/api-client.js')>('../../lib/api-client.js');
  return { ...actual, register: vi.fn() };
});

const validUser = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
};

async function fillValidForm(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Phone number'), '3001234567');
  await userEvent.type(screen.getByLabelText('First name'), 'Ana');
  await userEvent.type(screen.getByLabelText('Last name'), 'Gómez');

  const cityInput = screen.getByLabelText('City');
  await userEvent.click(cityInput);
  await userEvent.type(cityInput, 'Bogotá');
  await userEvent.click(screen.getByText('Bogotá D.C.'));

  await userEvent.type(document.getElementById('password') as HTMLInputElement, 'Abcdefg1');
  await userEvent.type(document.getElementById('confirmPassword') as HTMLInputElement, 'Abcdefg1');
}

describe('RegisterForm', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a phone error after blurring an invalid phone field', async () => {
    render(<RegisterForm />);

    const phoneInput = screen.getByLabelText('Phone number');
    await userEvent.type(phoneInput, '123');
    await userEvent.tab();

    expect(screen.getByRole('alert')).toHaveTextContent(/valid colombian mobile number/i);
  });

  it('shows the password strength meter while typing a password', async () => {
    render(<RegisterForm />);

    await userEvent.type(document.getElementById('password') as HTMLInputElement, 'Abcdefg1');

    expect(screen.getByTestId('password-strength-meter')).toBeInTheDocument();
  });

  it('shows a mismatch error when confirmation does not match', async () => {
    render(<RegisterForm />);

    await userEvent.type(document.getElementById('password') as HTMLInputElement, 'Abcdefg1');
    const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;
    await userEvent.type(confirmInput, 'Different1');
    await userEvent.tab();

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('clears the phone error as soon as it becomes valid, without needing blur', async () => {
    render(<RegisterForm />);

    const phoneInput = screen.getByLabelText('Phone number');
    await userEvent.type(phoneInput, '300123');
    await userEvent.tab();
    expect(screen.getByRole('alert')).toHaveTextContent(/valid colombian mobile number/i);

    await userEvent.click(phoneInput);
    await userEvent.type(phoneInput, '4567');

    expect(screen.queryByText(/valid colombian mobile number/i)).not.toBeInTheDocument();
  });

  it('clears the confirm-password mismatch error live once the passwords match again', async () => {
    render(<RegisterForm />);

    await userEvent.type(document.getElementById('password') as HTMLInputElement, 'Abcdefg1');
    const confirmInput = document.getElementById('confirmPassword') as HTMLInputElement;
    await userEvent.type(confirmInput, 'Different1');
    await userEvent.tab();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();

    await userEvent.clear(confirmInput);
    await userEvent.type(confirmInput, 'Abcdefg1');

    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
  });

  it('does not submit when the form has validation errors', async () => {
    render(<RegisterForm />);

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(register).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('registers, stores the user, and calls onSuccess', async () => {
    vi.mocked(register).mockResolvedValue(validUser);
    const onSuccess = vi.fn();
    render(<RegisterForm onSuccess={onSuccess} />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(useAuthStore.getState().user).toEqual(validUser);
  });

  it('shows a field error returned by the server', async () => {
    vi.mocked(register).mockRejectedValue(
      new ApiError('Phone number already registered', 409, {
        phone: 'This phone number is already registered',
      }),
    );
    render(<RegisterForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByText('This phone number is already registered')).toBeInTheDocument(),
    );
  });

  it('shows a generic server error banner for a non-field error', async () => {
    vi.mocked(register).mockRejectedValue(new ApiError('Something went wrong', 500));
    render(<RegisterForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeInTheDocument());
  });

  it('submits with no category preference selected', async () => {
    vi.mocked(register).mockResolvedValue(validUser);
    render(<RegisterForm />);

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(expect.objectContaining({ categoryPreference: '' })),
    );
  });

  it('submits the selected category preference', async () => {
    vi.mocked(register).mockResolvedValue(validUser);
    render(<RegisterForm />);

    await fillValidForm();
    await userEvent.selectOptions(screen.getByLabelText('Category preference'), 'jeans');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(
        expect.objectContaining({ categoryPreference: 'jeans' }),
      ),
    );
  });
});
