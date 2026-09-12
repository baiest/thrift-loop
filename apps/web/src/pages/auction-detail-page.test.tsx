import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuctionDetailPage } from './auction-detail-page.js';
import { useAuthStore } from '../stores/auth-store.js';
import { useRealtimeStore } from '../stores/realtime-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return {
    ...actual,
    fetchAuctionDetail: vi.fn(),
    fetchBids: vi.fn(),
    fetchCurrentUser: vi.fn(),
    updateAuction: vi.fn(),
    deleteAuction: vi.fn(),
    markAuctionSold: vi.fn(),
  };
});

const {
  fetchAuctionDetail,
  fetchBids,
  fetchCurrentUser,
  updateAuction,
  deleteAuction,
  markAuctionSold,
} = await import('../lib/api-client.js');

const publicAuction = {
  id: 'AUC-1',
  userId: 'USR-seller',
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

const sampleUser = {
  id: 'USR-bidder',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
};

function renderPage(id = 'AUC-1'): void {
  render(
    <MemoryRouter initialEntries={[`/auctions/${id}`]}>
      <Routes>
        <Route path="/auctions/:id" element={<AuctionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuctionDetailPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    useRealtimeStore.setState({
      status: 'idle',
      hasConnectedOnce: false,
      resyncToken: 0,
      unreadCount: 0,
      auctionUpdates: {},
      viewersByAuctionId: {},
    });
    vi.mocked(fetchAuctionDetail).mockReset();
    vi.mocked(fetchBids).mockReset();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(updateAuction).mockReset();
    vi.mocked(deleteAuction).mockReset();
    vi.mocked(markAuctionSold).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not poll for updates on an interval anymore', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    await vi.waitFor(() => expect(fetchAuctionDetail).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(20_000);

    expect(fetchAuctionDetail).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('reflects a live auction-updated message without an extra fetch', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    await screen.findByText(/50\.000/);

    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 75_000,
      bidCount: 1,
      bidEndsAt: null,
      serverTime: '2026-01-01T00:00:05.000Z',
    });

    expect(await screen.findByText(/75\.000/)).toBeInTheDocument();
    expect(fetchAuctionDetail).toHaveBeenCalledTimes(1);
  });

  it('briefly highlights the price when a live auction-updated message arrives', async () => {
    // A live-pushed price change happens fast enough to be missed entirely
    // without some visual cue drawing the eye to it.
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    const price = await screen.findByText(/50\.000/);
    expect(price).not.toHaveClass('animate-flash-highlight');

    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 75_000,
      bidCount: 1,
      bidEndsAt: null,
      serverTime: '2026-01-01T00:00:05.000Z',
    });

    expect(await screen.findByText(/75\.000/)).toHaveClass('animate-flash-highlight');
  });

  it('refreshes the bid history when a live auction-updated message arrives', async () => {
    // Regression: the price/bid-count merge into `auction` is purely local
    // (withLiveUpdate), but the bid history list comes from its own `bids`
    // state, populated only by load()'s fetchBids call on mount/reconnect —
    // a live bid from another viewer moved the price but left the list
    // showing stale entries until a manual reload.
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValueOnce([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    await screen.findByText(/no bids yet/i);

    vi.mocked(fetchBids).mockResolvedValueOnce([
      {
        id: 'BID-1',
        auctionId: 'AUC-1',
        bidderId: 'USR-bidder',
        bidderFirstName: 'Ana',
        amountCOP: 75_000,
        createdAt: '2026-01-01T00:00:05.000Z',
      },
    ]);
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 75_000,
      bidCount: 1,
      bidEndsAt: null,
      serverTime: '2026-01-01T00:00:05.000Z',
    });

    expect(await screen.findByText(/Ana/)).toBeInTheDocument();
  });

  it('flips to Sold live when a live auction-closed message arrives', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();
    await screen.findByLabelText('Your bid (COP)');

    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-closed',
      auctionId: 'AUC-1',
      winnerUserId: 'USR-bidder',
      serverTime: '2026-01-01T00:00:05.000Z',
    });

    await waitFor(() => expect(screen.queryByLabelText('Your bid (COP)')).not.toBeInTheDocument());
    // No bid was ever placed (currentBidCOP stays null) — the closed-auction message
    // must not zero out the price display.
    expect(screen.getByText('Starting at')).toBeInTheDocument();
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it('celebrates the winner when a live auction-closed message names them as winnerUserId', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();
    await screen.findByLabelText('Your bid (COP)');
    expect(screen.queryByTestId('winner-celebration')).not.toBeInTheDocument();

    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-closed',
      auctionId: 'AUC-1',
      winnerUserId: sampleUser.id,
      serverTime: '2026-01-01T00:00:05.000Z',
    });

    expect(await screen.findByTestId('winner-celebration')).toBeInTheDocument();
  });

  it('does not celebrate a viewer who is not the winner', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();
    await screen.findByLabelText('Your bid (COP)');

    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-closed',
      auctionId: 'AUC-1',
      winnerUserId: 'USR-someone-else',
      serverTime: '2026-01-01T00:00:05.000Z',
    });

    await waitFor(() => expect(screen.queryByLabelText('Your bid (COP)')).not.toBeInTheDocument());
    expect(screen.queryByTestId('winner-celebration')).not.toBeInTheDocument();
  });

  it('does not celebrate on an initial fetch of an already-sold auction the viewer won', async () => {
    const soldAuction = {
      ...publicAuction,
      status: 'sold' as const,
      winnerUserId: sampleUser.id,
    };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: soldAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await screen.findByText('Ended');
    expect(screen.queryByTestId('winner-celebration')).not.toBeInTheDocument();
  });

  it('hydrates the shared auth store on load, not just its own local state', async () => {
    // Regression: every other route hydrates useAuthStore on mount so
    // RealtimeConnection (which gates client.connect() on it) and SidebarNav
    // see the session. This page instead kept the fetched viewer in a plain
    // useState shadowed under the same name — the global store never learned
    // about the session, so on a fresh/direct load of the detail page (not
    // client-side-navigated from an already-connected route) the realtime
    // WebSocket never opened at all: bids placed here produced no live update.
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(sampleUser));
  });

  it('shows a live viewer count', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    await screen.findByText(/50\.000/);

    useRealtimeStore.getState().applyServerMessage({
      type: 'presence',
      auctionId: 'AUC-1',
      viewers: 3,
    });

    expect(await screen.findByText(/3 people viewing/i)).toBeInTheDocument();
  });

  it('refetches when the connection resyncs after a reconnect', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    await screen.findByText(/50\.000/);

    useRealtimeStore.getState().setStatus('open');
    useRealtimeStore.getState().setStatus('reconnecting');
    useRealtimeStore.getState().setStatus('open');

    await vi.waitFor(() => expect(fetchAuctionDetail).toHaveBeenCalledTimes(2));
  });

  it('shows a reconnecting hint after the connection has been down a while', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();
    await vi.waitFor(() => expect(fetchAuctionDetail).toHaveBeenCalled());

    useRealtimeStore.getState().setStatus('reconnecting');
    expect(screen.queryByText(/reconnecting/i)).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(15_000);
    expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows a skeleton instead of a blank screen while loading', () => {
    vi.mocked(fetchAuctionDetail).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchBids).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchCurrentUser).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByLabelText('Loading auction details')).toBeInTheDocument();
  });

  it('shows the auction details and bid history', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText(/50\.000/)).toBeInTheDocument();
    expect(screen.getByText('No bids yet — be the first.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: publicAuction.title })).toBeInTheDocument();
    expect(screen.getByText(publicAuction.description)).toBeInTheDocument();
    expect(screen.getByText(publicAuction.location)).toBeInTheDocument();
  });

  it('uses the same heading size as the other pages', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByRole('heading', { name: publicAuction.title })).toHaveClass(
      'text-3xl',
    );
  });

  it('shows a placeholder icon when the auction has no photos', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByLabelText('No photo')).toBeInTheDocument();
  });

  it('falls back to the placeholder icon when the photo fails to load', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: { ...publicAuction, photoUrls: ['/uploads/broken.jpg'] },
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    const image = await screen.findByRole('img');
    image.dispatchEvent(new Event('error'));

    expect(await screen.findByLabelText('No photo')).toBeInTheDocument();
  });

  it('shows a 404 message when the auction does not exist', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue(null);
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage('AUC-missing');

    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
  });

  it('shows the bid form for a logged-in non-owner', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByLabelText('Your bid (COP)')).toBeInTheDocument();
  });

  it('does not show the bid form for the owner', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    await screen.findByText(/50\.000/);
    expect(screen.queryByLabelText('Your bid (COP)')).not.toBeInTheDocument();
  });

  it('still shows the bid control for an anonymous viewer, prompting login instead of hiding it', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    await screen.findByText(/50\.000/);
    expect(
      await screen.findByRole('button', { name: /log in to place a bid/i }),
    ).toBeInTheDocument();
  });

  it('sends an anonymous viewer to /login when they try to bid', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/auctions/AUC-1']}>
        <Routes>
          <Route path="/auctions/:id" element={<AuctionDetailPage />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /log in to place a bid/i }));

    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('shows a Publish now button to the owner of a draft auction', async () => {
    const draftAuction = { ...publicAuction, status: 'draft' as const };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: draftAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    expect(await screen.findByRole('button', { name: /publish now/i })).toBeInTheDocument();
  });

  it('does not show a Publish now button for a non-owner viewing a draft', async () => {
    const draftAuction = { ...publicAuction, status: 'draft' as const };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: draftAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await screen.findByText(/50\.000/);
    expect(screen.queryByRole('button', { name: /publish now/i })).not.toBeInTheDocument();
  });

  it('does not show a Publish now button once the auction is published', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    await screen.findByText(/50\.000/);
    expect(screen.queryByRole('button', { name: /publish now/i })).not.toBeInTheDocument();
  });

  it('publishes the draft and refreshes the auction', async () => {
    const draftAuction = { ...publicAuction, status: 'draft' as const };
    vi.mocked(fetchAuctionDetail)
      .mockResolvedValueOnce({ auction: draftAuction, serverTime: '2026-01-01T00:00:00.000Z' })
      .mockResolvedValueOnce({ auction: publicAuction, serverTime: '2026-01-01T00:00:00.000Z' });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });
    vi.mocked(updateAuction).mockResolvedValue(publicAuction);

    renderPage();
    const publishButton = await screen.findByRole('button', { name: /publish now/i });
    await userEvent.click(publishButton);

    expect(updateAuction).toHaveBeenCalledWith('AUC-1', { status: 'published' });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /publish now/i })).not.toBeInTheDocument(),
    );
  });

  it('shows Ended, not a live countdown, for a sold auction with a stale future bidEndsAt', async () => {
    // A seed script or clock skew can leave a sold auction's bidEndsAt in the
    // future — status must still win over a running countdown.
    const soldAuction = {
      ...publicAuction,
      status: 'sold' as const,
      winnerUserId: 'USR-bidder',
      bidEndsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: soldAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('Ended')).toBeInTheDocument();
    expect(screen.queryByText(/left$/)).not.toBeInTheDocument();
  });

  it('shows a Delete auction button to the owner of an unsold auction', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    expect(await screen.findByRole('button', { name: /delete auction/i })).toBeInTheDocument();
  });

  it('keeps the Delete auction button text visible over its white background', async () => {
    // Regression: the shared Button atom's base classes include text-white;
    // overriding just the background to bg-white left the text color still
    // white too (same CSS specificity, and the base class wins the cascade
    // tie regardless of prop order), rendering white-on-white — invisible.
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();
    const deleteButton = await screen.findByRole('button', { name: /delete auction/i });

    // The `!` marks these !important, so they win the cascade tie against
    // the base Button classes still present in the same class list.
    expect(deleteButton).toHaveClass('!bg-white');
    expect(deleteButton).toHaveClass('!text-red-600');
  });

  it('does not show Delete auction for a non-owner', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await screen.findByText(/50\.000/);
    expect(screen.queryByRole('button', { name: /delete auction/i })).not.toBeInTheDocument();
  });

  it('does not show Delete auction once the auction has bids', async () => {
    const biddedAuction = { ...publicAuction, bidCount: 1, currentBidCOP: 60_000 };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: biddedAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    await screen.findByText(/60\.000/);
    expect(screen.queryByRole('button', { name: /delete auction/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation, then deletes the auction and navigates away', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });
    vi.mocked(deleteAuction).mockResolvedValue(undefined);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /delete auction/i }));

    expect(deleteAuction).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: /confirm delete/i }));

    await waitFor(() => expect(deleteAuction).toHaveBeenCalledWith('AUC-1'));
  });

  it('keeps the Cancel button text visible over its white background', async () => {
    // Same white-on-white bug as Delete auction: overriding only the
    // background left the base Button text-white class winning the tie.
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /delete auction/i }));
    const cancelButton = await screen.findByRole('button', { name: /^cancel$/i });

    expect(cancelButton).toHaveClass('!bg-white');
    expect(cancelButton).toHaveClass('!text-ink');
  });

  it('shows an error and lets the user retry if deleting fails', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });
    vi.mocked(deleteAuction).mockRejectedValue(new Error('network error'));

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /delete auction/i }));
    await userEvent.click(await screen.findByRole('button', { name: /confirm delete/i }));

    expect(await screen.findByText(/could not delete/i)).toBeInTheDocument();
  });

  it('shows a Mark as sold button to the owner of a published auction with a bid', async () => {
    const biddedAuction = { ...publicAuction, bidCount: 1, currentBidCOP: 60_000 };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: biddedAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    expect(await screen.findByRole('button', { name: /mark as sold/i })).toBeInTheDocument();
  });

  it('does not show Mark as sold when there are no bids yet', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });

    renderPage();

    await screen.findByText(/50\.000/);
    expect(screen.queryByRole('button', { name: /mark as sold/i })).not.toBeInTheDocument();
  });

  it('does not show Mark as sold to a non-owner', async () => {
    const biddedAuction = { ...publicAuction, bidCount: 1, currentBidCOP: 60_000 };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: biddedAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    await screen.findByText(/60\.000/);
    expect(screen.queryByRole('button', { name: /mark as sold/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation, then closes the auction and refreshes it', async () => {
    const biddedAuction = { ...publicAuction, bidCount: 1, currentBidCOP: 60_000 };
    const soldAuction = { ...biddedAuction, status: 'sold' as const, winnerUserId: 'USR-bidder' };
    vi.mocked(fetchAuctionDetail)
      .mockResolvedValueOnce({ auction: biddedAuction, serverTime: '2026-01-01T00:00:00.000Z' })
      .mockResolvedValueOnce({ auction: soldAuction, serverTime: '2026-01-01T00:00:05.000Z' });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });
    vi.mocked(markAuctionSold).mockResolvedValue(soldAuction);

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /mark as sold/i }));

    expect(markAuctionSold).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    await waitFor(() => expect(markAuctionSold).toHaveBeenCalledWith('AUC-1'));
    expect(await screen.findByText('Ended')).toBeInTheDocument();
  });

  it('shows an error and lets the user retry if closing fails', async () => {
    const biddedAuction = { ...publicAuction, bidCount: 1, currentBidCOP: 60_000 };
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: biddedAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue({ ...sampleUser, id: 'USR-seller' });
    vi.mocked(markAuctionSold).mockRejectedValue(new Error('network error'));

    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /mark as sold/i }));
    await userEvent.click(await screen.findByRole('button', { name: /confirm/i }));

    expect(await screen.findByText(/could not close/i)).toBeInTheDocument();
  });
});
