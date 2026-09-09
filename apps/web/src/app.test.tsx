import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './app.js';

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      }),
    );
    window.history.pushState({}, '', '/login');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the login page at /login', async () => {
    render(<App />);
    expect(await screen.findByText('Welcome back')).toBeInTheDocument();
  });

  it('renders the create-auction page inside the app layout with a sidebar', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          user: {
            id: 'USR-1',
            firstName: 'Ana',
            lastName: 'Gómez',
            city: 'Bogotá D.C.',
            country: 'CO',
            address: null,
            categoryPreference: null,
          },
        }),
    } as Response);
    window.history.pushState({}, '', '/auctions/new');

    render(<App />);

    expect(await screen.findByRole('heading', { name: /create auction/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });

  it('renders the public auctions grid at /', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ auctions: [] }),
    } as Response);
    window.history.pushState({}, '', '/');

    render(<App />);

    expect(await screen.findByText(/no auctions/i)).toBeInTheDocument();
  });
});
