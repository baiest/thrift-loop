import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateAuctionPage } from './create-auction-page.js';

describe('CreateAuctionPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Not authenticated' }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the create auction form', () => {
    render(
      <MemoryRouter>
        <CreateAuctionPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /create auction/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });
});
