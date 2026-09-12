import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuctionsPage } from './auctions-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchAuctions: vi.fn(), fetchCurrentUser: vi.fn(), fetchMyBids: vi.fn() };
});

const { fetchAuctions, fetchCurrentUser, fetchMyBids } = await import('../lib/api-client.js');

const publicAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
  title: 'Chaqueta de cuero',
  description: 'Chaqueta de cuero en excelente estado.',
  category: 'jeans' as const,
  condition: 'good' as const,
  priceCOP: 50_000,
  maxBidIncrementCOP: 5_000,
  publishAt: null,
  status: 'published' as const,
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

function renderPage(initialEntries: string[] = ['/']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuctionsPage />
    </MemoryRouter>,
  );
}

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Cali',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
};

describe('AuctionsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchAuctions).mockReset();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchMyBids).mockReset();
    vi.mocked(fetchAuctions).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
    vi.mocked(fetchMyBids).mockResolvedValue([]);
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
    renderPage();

    expect(await screen.findByText(/no auctions/i)).toBeInTheDocument();
  });

  it('renders the search field, with the other filters collapsed behind Filters', async () => {
    renderPage();

    expect(await screen.findByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
  });

  it('defaults the city filter to the logged-in user own city, shown as a chip', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByText('Cali')).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(fetchAuctions).toHaveBeenCalledWith(expect.objectContaining({ city: 'Cali' })),
    );
  });

  it('hydrates the shared auth store on load, not just its own local state', async () => {
    // Regression: every other route hydrates useAuthStore on mount (so
    // SidebarNav and RealtimeConnection see the session), but this page —
    // the "/" landing route, so the one most likely to be a visitor's first
    // load — only tracked currentUserId in local state. That left the
    // sidebar's logged-in section and the realtime WebSocket connection
    // (which both key off useAuthStore) dark on a fresh visit or hard reload,
    // even with a valid session cookie.
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await vi.waitFor(() => expect(useAuthStore.getState().user).toEqual(sampleUser));
  });

  it('does not re-apply the profile city default once the user has explicitly cleared it', async () => {
    // Simulates: user cleared the "Cali" chip (writing city= empty to the URL),
    // then reloaded the page — a fresh mount with that URL already in place.
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage(['/?sort=newest']);

    await vi.waitFor(() => expect(fetchAuctions).toHaveBeenCalled());
    expect(screen.queryByText('Cali')).not.toBeInTheDocument();
  });

  it('persists a search filter across a reload via the URL', async () => {
    renderPage(['/?search=denim']);

    await vi.waitFor(() =>
      expect(fetchAuctions).toHaveBeenCalledWith(expect.objectContaining({ search: 'denim' })),
    );
  });

  it('renders a subtitle and a Create auction link in the header', async () => {
    renderPage();

    expect(
      screen.getByText(/curated vintage pieces|second-hand clothing|secondhand fashion/i),
    ).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /create auction/i })).toHaveAttribute(
      'href',
      '/auctions/new',
    );
  });

  it('shows the result count and defaults the sort to newest', async () => {
    vi.mocked(fetchAuctions).mockResolvedValue([publicAuction]);

    renderPage();

    expect(await screen.findByText('1 item available to bid')).toBeInTheDocument();
    expect(screen.getByLabelText(/sort/i)).toHaveValue('newest');
  });

  it('refetches immediately when the sort changes, without waiting for the debounce', async () => {
    renderPage();
    await vi.waitFor(() => expect(fetchAuctions).toHaveBeenCalledTimes(1));
    vi.mocked(fetchAuctions).mockClear();

    const sortSelect = await screen.findByLabelText(/sort/i);
    fireEvent.change(sortSelect, { target: { value: 'price-asc' } });

    await vi.waitFor(() =>
      expect(fetchAuctions).toHaveBeenCalledWith(expect.objectContaining({ sort: 'price-asc' })),
    );
  });

  it('debounces the search box before fetching', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await vi.waitFor(() => expect(fetchAuctions).toHaveBeenCalledTimes(1));
    vi.mocked(fetchAuctions).mockClear();

    const search = await screen.findByRole('searchbox');
    act(() => {
      fireEvent.change(search, { target: { value: 'c' } });
      fireEvent.change(search, { target: { value: 'ch' } });
      fireEvent.change(search, { target: { value: 'cha' } });
    });

    expect(fetchAuctions).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fetchAuctions).toHaveBeenCalledTimes(1);
    expect(fetchAuctions).toHaveBeenCalledWith(expect.objectContaining({ search: 'cha' }));
    vi.useRealTimers();
  });

  it('shows the viewer own bid on a card when signed in and already bid on it', async () => {
    vi.mocked(fetchAuctions).mockResolvedValue([publicAuction]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyBids).mockResolvedValue([
      { auction: publicAuction, myBidCOP: 45_000, isWinning: true },
    ]);

    renderPage();

    expect(await screen.findByText(/you bid/i)).toBeInTheDocument();
  });

  it('does not fetch my bids for an anonymous viewer', async () => {
    vi.mocked(fetchAuctions).mockResolvedValue([publicAuction]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    await screen.findByRole('link');
    expect(fetchMyBids).not.toHaveBeenCalled();
  });
});
