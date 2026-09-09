import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuctionDetailPage } from './auction-detail-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return {
    ...actual,
    fetchAuctionDetail: vi.fn(),
    fetchBids: vi.fn(),
    fetchCurrentUser: vi.fn(),
    updateAuction: vi.fn(),
  };
});

const { fetchAuctionDetail, fetchBids, fetchCurrentUser, updateAuction } =
  await import('../lib/api-client.js');

const publicAuction = {
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
    vi.mocked(fetchAuctionDetail).mockReset();
    vi.mocked(fetchBids).mockReset();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(updateAuction).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('does not show the bid form for an anonymous viewer', async () => {
    vi.mocked(fetchAuctionDetail).mockResolvedValue({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(fetchBids).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    await screen.findByText(/50\.000/);
    expect(screen.queryByLabelText('Your bid (COP)')).not.toBeInTheDocument();
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
});
