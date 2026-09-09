import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicAuction } from '@thrift-loop/shared';
import { AuctionCard } from './auction-card.js';

function makeAuction(overrides: Partial<PublicAuction> = {}): PublicAuction {
  return {
    id: 'AUC-1',
    userId: 'USR-1',
    title: 'Chaqueta de cuero',
    description: 'Chaqueta de cuero en excelente estado.',
    category: 'jeans',
    condition: 'good',
    priceCOP: 50_000,
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

function renderCard(auction: PublicAuction, isOwn = false): void {
  render(
    <MemoryRouter>
      <AuctionCard auction={auction} isOwn={isOwn} />
    </MemoryRouter>,
  );
}

describe('AuctionCard', () => {
  it('links to the auction detail page', () => {
    renderCard(makeAuction());
    expect(screen.getByRole('link')).toHaveAttribute('href', '/auctions/AUC-1');
  });

  it('shows the starting price when there are no bids yet', () => {
    renderCard(makeAuction({ priceCOP: 50_000, currentBidCOP: null }));
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it('shows the current bid when there is one', () => {
    renderCard(makeAuction({ priceCOP: 50_000, currentBidCOP: 60_000 }));
    expect(screen.getByText(/60\.000/)).toBeInTheDocument();
  });

  it('shows a placeholder when there are no photos', () => {
    renderCard(makeAuction({ photoUrls: [] }));
    expect(screen.getByLabelText('No photo')).toBeInTheDocument();
  });

  it('shows the first photo when there is one', () => {
    renderCard(makeAuction({ photoUrls: ['/uploads/a.jpg'] }));
    expect(screen.getByRole('img')).toHaveAttribute('src', '/uploads/a.jpg');
  });

  it('shows the title', () => {
    renderCard(makeAuction({ title: 'Chaqueta de cuero' }));
    expect(screen.getByText('Chaqueta de cuero')).toBeInTheDocument();
  });

  it('shows the condition', () => {
    renderCard(makeAuction({ condition: 'new-with-tag' }));
    expect(screen.getByText('New with tag')).toBeInTheDocument();
  });

  it('shows a "Yours" badge for the caller own auction', () => {
    renderCard(makeAuction(), true);
    expect(screen.getByText('Yours')).toBeInTheDocument();
  });

  it('does not show a "Yours" badge for someone else auction', () => {
    renderCard(makeAuction(), false);
    expect(screen.queryByText('Yours')).not.toBeInTheDocument();
  });

  it('shows a "Sold" badge once sold', () => {
    renderCard(makeAuction({ status: 'sold' }));
    expect(screen.getByText('Sold')).toBeInTheDocument();
  });
});
