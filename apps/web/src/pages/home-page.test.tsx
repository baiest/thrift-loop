import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from './home-page.js';
import { useAuthStore } from '../stores/auth-store.js';

const sampleUser = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
};

function renderHome(): void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<p>login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to /login when there is no session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      }),
    );

    renderHome();

    expect(await screen.findByText('login screen')).toBeInTheDocument();
  });

  it('greets the user restored from an existing session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ user: sampleUser }),
      }),
    );

    renderHome();

    expect(await screen.findByText('Welcome, Ana')).toBeInTheDocument();
  });

  it('logs out and redirects to /login', async () => {
    useAuthStore.getState().setUser(sampleUser);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve({}) }),
    );

    renderHome();
    await userEvent.click(await screen.findByRole('button', { name: /log out/i }));

    await waitFor(() => expect(screen.getByText('login screen')).toBeInTheDocument());
    expect(useAuthStore.getState().user).toBeNull();
  });
});
