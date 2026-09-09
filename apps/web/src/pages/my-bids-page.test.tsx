import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MyBidsPage } from './my-bids-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchCurrentUser: vi.fn(), fetchMyBids: vi.fn() };
});

const { fetchCurrentUser, fetchMyBids } = await import('../lib/api-client.js');

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
};

const baseAuction = {
  id: 'AUC-1',
  userId: 'USR-seller',
  title: 'Chaqueta de cuero',
  description: 'Chaqueta de cuero en excelente estado.',
  category: 'jeans' as const,
  condition: 'good' as const,
  priceCOP: 50_000,
  publishAt: null,
  status: 'published' as const,
  deliveryMethod: 'pickup' as const,
  photoUrls: [],
  currentBidCOP: 60_000,
  bidCount: 2,
  bidEndsAt: null,
  winnerUserId: null,
  location: 'Cali',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/my-bids']}>
      <Routes>
        <Route path="/my-bids" element={<MyBidsPage />} />
        <Route path="/login" element={<p>login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MyBidsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchMyBids).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /login when there is no session', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('login screen')).toBeInTheDocument();
  });

  it('shows an empty state when the user has not bid on anything', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/no bids yet/i)).toBeInTheDocument();
  });

  it('shows a Winning row when the user has the current bid', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      { auction: { ...baseAuction, currentBidCOP: 60_000 }, myBidCOP: 60_000, isWinning: true },
    ]);

    renderPage();

    expect(await screen.findByText('Chaqueta de cuero')).toBeInTheDocument();
    expect(screen.getByText('Winning')).toBeInTheDocument();
    expect(screen.getAllByText(/60\.000/).length).toBeGreaterThan(0);
  });

  it('shows time remaining for a still-open auction', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      {
        auction: {
          ...baseAuction,
          bidEndsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        myBidCOP: 60_000,
        isWinning: true,
      },
    ]);

    renderPage();

    expect(await screen.findByText(/\dm left/)).toBeInTheDocument();
  });

  it('shows no time remaining for a sold auction', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      {
        auction: { ...baseAuction, status: 'sold', winnerUserId: 'USR-1' },
        myBidCOP: 60_000,
        isWinning: false,
      },
    ]);

    renderPage();

    await screen.findByText('Won');
    expect(screen.queryByText(/left$/)).not.toBeInTheDocument();
  });

  it('shows an Outbid row when someone else is ahead', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      { auction: { ...baseAuction, currentBidCOP: 70_000 }, myBidCOP: 60_000, isWinning: false },
    ]);

    renderPage();

    expect(await screen.findByText('Outbid')).toBeInTheDocument();
  });

  it('shows a Won row when the auction sold to the current user', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      {
        auction: { ...baseAuction, status: 'sold', winnerUserId: 'USR-1' },
        myBidCOP: 60_000,
        isWinning: false,
      },
    ]);

    renderPage();

    expect(await screen.findByText('Won')).toBeInTheDocument();
  });

  it('shows a Lost row when the auction sold to someone else', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      {
        auction: { ...baseAuction, status: 'sold', winnerUserId: 'USR-other' },
        myBidCOP: 60_000,
        isWinning: false,
      },
    ]);

    renderPage();

    expect(await screen.findByText('Lost')).toBeInTheDocument();
  });

  it('renders as a photo grid, not a list', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      { auction: baseAuction, myBidCOP: 60_000, isWinning: true },
    ]);

    renderPage();

    expect(await screen.findByLabelText('No photo')).toBeInTheDocument();
    expect(document.querySelector('ul')).not.toBeInTheDocument();
  });

  it('orders auctions by soonest to end first', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      {
        auction: {
          ...baseAuction,
          id: 'AUC-far',
          title: 'Ends later',
          bidEndsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        myBidCOP: 60_000,
        isWinning: true,
      },
      {
        auction: { ...baseAuction, id: 'AUC-sold', title: 'Already sold', status: 'sold' },
        myBidCOP: 60_000,
        isWinning: false,
      },
      {
        auction: {
          ...baseAuction,
          id: 'AUC-soon',
          title: 'Ends soon',
          bidEndsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
        myBidCOP: 60_000,
        isWinning: true,
      },
    ]);

    renderPage();

    const titles = (await screen.findAllByText(/^Ends|^Already/)).map((el) => el.textContent);
    expect(titles).toEqual(['Ends soon', 'Ends later', 'Already sold']);
  });
});
