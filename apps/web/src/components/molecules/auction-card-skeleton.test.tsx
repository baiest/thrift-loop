import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuctionCardSkeleton } from './auction-card-skeleton.js';

describe('AuctionCardSkeleton', () => {
  it('renders a card-shaped placeholder', () => {
    render(<AuctionCardSkeleton />);
    expect(screen.getByLabelText('Loading auction')).toBeInTheDocument();
  });

  it('renders multiple shimmering blocks matching the card layout', () => {
    render(<AuctionCardSkeleton />);
    const card = screen.getByLabelText('Loading auction');
    expect(card.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(4);
  });
});
