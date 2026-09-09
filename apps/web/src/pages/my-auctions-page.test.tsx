import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MyAuctionsPage } from './my-auctions-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchCurrentUser: vi.fn(), fetchMyAuctions: vi.fn() };
});

const { fetchCurrentUser, fetchMyAuctions } = await import('../lib/api-client.js');

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
};

const draftAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
  title: 'Chaqueta de cuero',
  description: 'Chaqueta de cuero en excelente estado.',
  category: 'jeans' as const,
  condition: 'good' as const,
  priceCOP: 50_000,
  publishAt: null,
  status: 'draft' as const,
  deliveryMethod: 'pickup' as const,
  photoUrls: [],
  currentBidCOP: null,
  bidCount: 0,
  bidEndsAt: null,
  winnerUserId: null,
  location: 'Bogotá D.C.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/auctions/mine']}>
      <Routes>
        <Route path="/auctions/mine" element={<MyAuctionsPage />} />
        <Route path="/login" element={<p>login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MyAuctionsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchMyAuctions).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a skeleton instead of a blank screen while the session loads', () => {
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByLabelText('Loading my auctions')).toBeInTheDocument();
  });

  it('redirects to /login when there is no session', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('login screen')).toBeInTheDocument();
  });

  it('shows an empty state when there are no auctions', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyAuctions).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/no auctions/i)).toBeInTheDocument();
  });

  it('shows a draft auction with its Draft badge', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyAuctions).mockResolvedValue([draftAuction]);

    renderPage();

    expect(await screen.findByText('Chaqueta de cuero')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
