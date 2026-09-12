import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { useRealtimeStore } from '../../stores/realtime-store.js';
import { AuctionGrid } from './auction-grid.js';

function makeAuction(overrides: Partial<PublicAuction> = {}): PublicAuction {
  return {
    id: 'AUC-1',
    userId: 'USR-1',
    title: 'Chaqueta de cuero',
    description: 'Chaqueta de cuero en excelente estado.',
    category: 'jeans',
    condition: 'good',
    priceCOP: 50_000,
    maxBidIncrementCOP: 5_000,
    publishAt: null,
    status: 'published',
    deliveryMethod: 'pickup',
    photoUrls: [],
    currentBidCOP: null,
    bidCount: 0,
    bidEndsAt: null,
    winnerUserId: null,
    location: 'Bogotá D.C.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderGrid(props: Partial<React.ComponentProps<typeof AuctionGrid>> = {}): void {
  render(
    <MemoryRouter>
      <AuctionGrid auctions={[]} isLoading={false} error={null} currentUserId={null} {...props} />
    </MemoryRouter>,
  );
}

describe('AuctionGrid', () => {
  afterEach(() => {
    useRealtimeStore.setState({
      status: 'idle',
      hasConnectedOnce: false,
      resyncToken: 0,
      unreadCount: 0,
      auctionUpdates: {},
      viewersByAuctionId: {},
    });
  });

  it('reflects a live price/bid-count update for a rendered auction', () => {
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-updated',
      auctionId: 'AUC-1',
      currentBidCOP: 75_000,
      bidCount: 3,
      bidEndsAt: null,
      serverTime: '2026-01-01T00:00:00.000Z',
    });

    renderGrid({ auctions: [makeAuction({ id: 'AUC-1', priceCOP: 50_000, currentBidCOP: null })] });

    expect(screen.getByText(/75\.000/)).toBeInTheDocument();
  });

  it('flips a card to Sold once a live auction-closed arrives', () => {
    useRealtimeStore.getState().applyServerMessage({
      type: 'auction-closed',
      auctionId: 'AUC-1',
      winnerUserId: 'USR-winner',
      serverTime: '2026-01-01T00:00:00.000Z',
    });

    renderGrid({
      auctions: [
        makeAuction({ id: 'AUC-1', status: 'published', priceCOP: 50_000, currentBidCOP: null }),
      ],
    });

    expect(screen.getByText('Sold')).toBeInTheDocument();
    // No bid was ever placed — the closed-auction message must not zero out the price.
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it('shows skeleton placeholders instead of a "Loading" string', () => {
    renderGrid({ isLoading: true });
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.getAllByLabelText('Loading auction').length).toBeGreaterThan(0);
  });

  it('shows an error state', () => {
    renderGrid({ error: 'Something went wrong' });
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    renderGrid({ auctions: [] });
    expect(screen.getByText(/no auctions/i)).toBeInTheDocument();
  });

  it('renders one card per auction', () => {
    renderGrid({
      auctions: [makeAuction({ id: 'AUC-1' }), makeAuction({ id: 'AUC-2' })],
    });
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('marks the caller own auctions', () => {
    renderGrid({
      auctions: [makeAuction({ id: 'AUC-1', userId: 'USR-1' })],
      currentUserId: 'USR-1',
    });
    expect(screen.getByText('Yours')).toBeInTheDocument();
  });

  it('passes the viewer own bid to the matching card', () => {
    renderGrid({
      auctions: [makeAuction({ id: 'AUC-1' })],
      myBidsByAuctionId: new Map([['AUC-1', 45_000]]),
    });
    expect(screen.getByText(/you bid/i)).toBeInTheDocument();
  });
});
