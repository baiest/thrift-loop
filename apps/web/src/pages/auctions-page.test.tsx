import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuctionsPage } from './auctions-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchAuctions: vi.fn(), fetchCurrentUser: vi.fn() };
});

const { fetchAuctions, fetchCurrentUser } = await import('../lib/api-client.js');

const publicAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
  category: 'jeans' as const,
  condition: 'good' as const,
  priceCOP: 50_000,
  publishAt: null,
  status: 'published' as const,
  deliveryMethod: 'pickup' as const,
  photoUrls: [],
  currentBidCOP: null,
  bidCount: 0,
  bidEndsAt: null,
  winnerUserId: null,
  sellerCity: 'Bogotá D.C.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(): void {
  render(
    <MemoryRouter>
      <AuctionsPage />
    </MemoryRouter>,
  );
}

describe('AuctionsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchAuctions).mockReset();
    vi.mocked(fetchCurrentUser).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the auctions without requiring a session', async () => {
    vi.mocked(fetchAuctions).mockResolvedValue([publicAuction]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByRole('link')).toBeInTheDocument();
  });

  it('shows an empty state when there are no auctions', async () => {
    vi.mocked(fetchAuctions).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText(/no auctions/i)).toBeInTheDocument();
  });
});
