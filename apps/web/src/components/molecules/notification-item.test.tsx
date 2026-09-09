import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicNotification } from '@thrift-loop/shared';
import { NotificationItem } from './notification-item.js';

function makeNotification(overrides: Partial<PublicNotification> = {}): PublicNotification {
  return {
    id: 'NTF-1',
    type: 'outbid',
    auctionId: 'AUC-1',
    auctionTitle: 'Chaqueta de cuero',
    amountCOP: 60_000,
    actorFirstName: 'Ana',
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderItem(notification: PublicNotification): void {
  render(
    <MemoryRouter>
      <NotificationItem notification={notification} />
    </MemoryRouter>,
  );
}

describe('NotificationItem', () => {
  it('links to the auction', () => {
    renderItem(makeNotification());
    expect(screen.getByRole('link')).toHaveAttribute('href', '/auctions/AUC-1');
  });

  it('shows outbid copy', () => {
    renderItem(makeNotification({ type: 'outbid' }));
    expect(screen.getByText(/outbid/i)).toBeInTheDocument();
    expect(screen.getByText(/chaqueta de cuero/i)).toBeInTheDocument();
  });

  it('shows auction-won copy', () => {
    renderItem(makeNotification({ type: 'auction-won', actorFirstName: null }));
    expect(screen.getByText(/won/i)).toBeInTheDocument();
  });

  it('shows bid-on-my-listing copy with the bidder name', () => {
    renderItem(makeNotification({ type: 'bid-on-my-listing', actorFirstName: 'Bea' }));
    expect(screen.getByText(/bea/i)).toBeInTheDocument();
  });

  it('marks an unread notification visually distinct', () => {
    renderItem(makeNotification({ readAt: null }));
    expect(screen.getByRole('link')).toHaveClass('bg-brand-50');
  });

  it('does not mark a read notification', () => {
    renderItem(makeNotification({ readAt: '2026-01-02T00:00:00.000Z' }));
    expect(screen.getByRole('link')).not.toHaveClass('bg-brand-50');
  });
});
