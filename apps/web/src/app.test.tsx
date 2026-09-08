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
});
