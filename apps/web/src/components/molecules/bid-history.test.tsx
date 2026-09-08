import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PublicBid } from '@thrift-loop/shared';
import { BidHistory } from './bid-history.js';

function makeBid(overrides: Partial<PublicBid> = {}): PublicBid {
  return {
    id: 'BID-1',
    auctionId: 'AUC-1',
    bidderId: 'USR-2',
    bidderFirstName: 'Ana',
    amountCOP: 50_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('BidHistory', () => {
  it('shows an empty state when there are no bids', () => {
    render(<BidHistory bids={[]} />);
    expect(screen.getByText('No bids yet — be the first.')).toBeInTheDocument();
  });

  it('lists each bid with the bidder name and amount', () => {
    render(
      <BidHistory bids={[makeBid({ id: 'BID-1', bidderFirstName: 'Ana', amountCOP: 60_000 })]} />,
    );

    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/60\.000/)).toBeInTheDocument();
  });

  it('marks the first (newest/highest) bid', () => {
    render(
      <BidHistory
        bids={[
          makeBid({ id: 'BID-2', bidderFirstName: 'Carlos', amountCOP: 60_000 }),
          makeBid({ id: 'BID-1', bidderFirstName: 'Ana', amountCOP: 50_000 }),
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Highest');
    expect(items[1]).not.toHaveTextContent('Highest');
  });
});
