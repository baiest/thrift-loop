import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../lib/api-client.js';
import { formatCOPInput } from '../../lib/format.js';
import { BidForm, type BidFormProps } from './bid-form.js';

function renderBidForm(props: BidFormProps): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <BidForm {...props} />
    </MemoryRouter>,
  );
}

vi.mock('../../lib/api-client.js', async () => {
  const actual = await vi.importActual('../../lib/api-client.js');
  return { ...actual, placeBid: vi.fn() };
});

const { placeBid } = await import('../../lib/api-client.js');

describe('BidForm', () => {
  beforeEach(() => {
    vi.mocked(placeBid).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pre-fills the amount with the minimum next bid, formatted as pesos (no bids yet)', () => {
    renderBidForm({
      auctionId: 'AUC-1',
      currentBidCOP: null,
      priceCOP: 50_000,
      onBidPlaced: vi.fn(),
    });
    expect(screen.getByLabelText('Your bid (COP)')).toHaveValue(formatCOPInput(50_000));
  });

  it('pre-fills the amount with currentBid + increment, formatted as pesos', () => {
    renderBidForm({
      auctionId: 'AUC-1',
      currentBidCOP: 50_000,
      priceCOP: 50_000,
      onBidPlaced: vi.fn(),
    });
    expect(screen.getByLabelText('Your bid (COP)')).toHaveValue(formatCOPInput(51_000));
  });

  it('submits the bid and calls onBidPlaced on success', async () => {
    const auction = { id: 'AUC-1' } as never;
    const bid = { id: 'BID-1' } as never;
    vi.mocked(placeBid).mockResolvedValue({ auction, bid });
    const onBidPlaced = vi.fn();

    renderBidForm({ auctionId: 'AUC-1', currentBidCOP: null, priceCOP: 50_000, onBidPlaced });
    await userEvent.click(screen.getByRole('button', { name: /place bid/i }));

    await waitFor(() => expect(onBidPlaced).toHaveBeenCalledWith(auction, bid));
    expect(placeBid).toHaveBeenCalledWith('AUC-1', 50_000);
  });

  it('shows a field error from the API', async () => {
    vi.mocked(placeBid).mockRejectedValue(
      new ApiError('Validation failed', 400, { amountCOP: 'Too low' }),
    );

    renderBidForm({
      auctionId: 'AUC-1',
      currentBidCOP: null,
      priceCOP: 50_000,
      onBidPlaced: vi.fn(),
    });
    await userEvent.click(screen.getByRole('button', { name: /place bid/i }));

    expect(await screen.findByText('Too low')).toBeInTheDocument();
  });

  it('is disabled while the bid is in flight', async () => {
    let resolvePromise: (value: { auction: never; bid: never }) => void = () => {};
    vi.mocked(placeBid).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    renderBidForm({
      auctionId: 'AUC-1',
      currentBidCOP: null,
      priceCOP: 50_000,
      onBidPlaced: vi.fn(),
    });
    await userEvent.click(screen.getByRole('button', { name: /place bid/i }));

    expect(screen.getByRole('button', { name: /placing/i })).toBeDisabled();

    resolvePromise({ auction: {} as never, bid: {} as never });
  });

  it('is disabled when disabled prop is set (own auction / not open)', () => {
    renderBidForm({
      auctionId: 'AUC-1',
      currentBidCOP: null,
      priceCOP: 50_000,
      onBidPlaced: vi.fn(),
      disabled: true,
    });
    expect(screen.getByRole('button', { name: /place bid/i })).toBeDisabled();
  });

  it('sends the user to /login instead of submitting a bid when requiresLogin is set', async () => {
    renderBidForm({
      auctionId: 'AUC-1',
      currentBidCOP: null,
      priceCOP: 50_000,
      onBidPlaced: vi.fn(),
      requiresLogin: true,
    });

    expect(screen.getByRole('button', { name: /log in to place a bid/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /log in to place a bid/i }));

    expect(placeBid).not.toHaveBeenCalled();
  });
});
