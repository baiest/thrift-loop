import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

function renderCard(
  auction: PublicAuction,
  isOwn = false,
  myBidCOP?: number,
  bidStatus?: 'Winning' | 'Outbid' | 'Won' | 'Lost',
): void {
  render(
    <MemoryRouter>
      <AuctionCard auction={auction} isOwn={isOwn} myBidCOP={myBidCOP} bidStatus={bidStatus} />
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

  it('falls back to the placeholder icon when the photo fails to load', () => {
    renderCard(makeAuction({ photoUrls: ['/uploads/broken.jpg'] }));

    fireEvent.error(screen.getByRole('img'));

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByLabelText('No photo')).toBeInTheDocument();
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

  it('shows a "Draft" badge while still a draft', () => {
    renderCard(makeAuction({ status: 'draft' }));
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('wraps status badges instead of overflowing the card on narrow screens', () => {
    renderCard(makeAuction({ status: 'draft' }), true);
    expect(screen.getByText('Draft').closest('div')).toHaveClass('flex-wrap');
  });

  it('shows a bid status badge when one is given', () => {
    renderCard(makeAuction(), false, 45_000, 'Winning');
    expect(screen.getByText('Winning')).toBeInTheDocument();
  });

  it('shows the bid status instead of the generic "Sold" badge once sold', () => {
    renderCard(makeAuction({ status: 'sold' }), false, 45_000, 'Lost');
    expect(screen.getByText('Lost')).toBeInTheDocument();
    expect(screen.queryByText('Sold')).not.toBeInTheDocument();
  });

  it('does not show a "Draft" badge once published', () => {
    renderCard(makeAuction({ status: 'published' }));
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('shows the auction start date', () => {
    renderCard(makeAuction({ createdAt: '2026-03-03T10:00:00.000Z' }));
    expect(screen.getByText(/^started/i)).toHaveTextContent(/mar 3/i);
  });

  it('shows the location', () => {
    renderCard(makeAuction({ location: 'Medellín' }));
    expect(screen.getByText(/medellín/i)).toBeInTheDocument();
  });

  it('shows the time remaining until the bid window ends', () => {
    renderCard(makeAuction({ bidEndsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString() }));
    expect(screen.getByText(/1h \d\dm left/)).toBeInTheDocument();
  });

  it('shows "Ended" once the bid window has passed', () => {
    renderCard(makeAuction({ bidEndsAt: new Date(Date.now() - 1000).toISOString() }));
    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('marks urgent auctions under an hour left', () => {
    renderCard(makeAuction({ bidEndsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() }));
    expect(screen.getByText(/\dm left/)).toHaveClass('text-brand-600');
  });

  it('shows the viewer own bid when one is known', () => {
    renderCard(makeAuction(), false, 45_000);
    expect(screen.getByText(/you bid/i)).toBeInTheDocument();
    expect(screen.getByText(/45\.000/)).toBeInTheDocument();
  });

  it('does not show a bid line when the viewer has not bid', () => {
    renderCard(makeAuction());
    expect(screen.queryByText(/you bid/i)).not.toBeInTheDocument();
  });

  it('briefly highlights the price when a live update changes it, not on initial render', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AuctionCard
          auction={makeAuction({ priceCOP: 50_000, currentBidCOP: null })}
          isOwn={false}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/50\.000/)).not.toHaveClass('animate-flash-highlight');

    rerender(
      <MemoryRouter>
        <AuctionCard
          auction={makeAuction({ priceCOP: 50_000, currentBidCOP: 60_000 })}
          isOwn={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/60\.000/)).toHaveClass('animate-flash-highlight');
  });
});
