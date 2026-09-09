import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateAuctionForm } from './create-auction-form.js';
import { ApiError, createAuction, uploadAuctionPhotos } from '../../lib/api-client.js';

vi.mock('../../lib/api-client.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../lib/api-client.js')>('../../lib/api-client.js');
  return { ...actual, createAuction: vi.fn(), uploadAuctionPhotos: vi.fn() };
});

const createdAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
  title: 'Chaqueta de cuero',
  category: 'jeans' as const,
  condition: 'good' as const,
  priceCOP: 50_000,
  publishAt: null,
  status: 'draft' as const,
  deliveryMethod: 'pickup' as const,
  photoUrls: [],
  currentBidCOP: null,
  bidCount: 0,
  bidEndsAt: null,
  winnerUserId: null,
  sellerCity: 'Bogotá D.C.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function fillRequiredFields(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Title'), 'Chaqueta de cuero');
  await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');
  await userEvent.selectOptions(screen.getByLabelText('Condition'), 'good');
  await userEvent.selectOptions(screen.getByLabelText('Delivery method'), 'pickup');
  await userEvent.type(screen.getByLabelText('Price (COP)'), '50000');
}

describe('CreateAuctionForm', () => {
  beforeEach(() => {
    vi.mocked(createAuction).mockResolvedValue(createdAuction);
    vi.mocked(uploadAuctionPhotos).mockResolvedValue(createdAuction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not submit when required fields are missing', async () => {
    render(<CreateAuctionForm />);

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    expect(createAuction).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('creates the auction with the entered values', async () => {
    render(<CreateAuctionForm />);
    await fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() =>
      expect(createAuction).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chaqueta de cuero',
          category: 'jeans',
          condition: 'good',
          deliveryMethod: 'pickup',
          priceCOP: '50000',
        }),
      ),
    );
  });

  it('calls onSuccess after a successful create with no photos', async () => {
    const onSuccess = vi.fn();
    render(<CreateAuctionForm onSuccess={onSuccess} />);
    await fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(uploadAuctionPhotos).not.toHaveBeenCalled();
  });

  it('uploads selected photos after creating the auction', async () => {
    render(<CreateAuctionForm />);
    await fillRequiredFields();

    const file = new File(['x'], 'front.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText(/add photos/i), file);

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() =>
      expect(uploadAuctionPhotos).toHaveBeenCalledWith('AUC-1', [
        expect.objectContaining({ name: 'front.jpg' }),
      ]),
    );
  });

  it('shows inline feedback when the title exceeds the max length', async () => {
    render(<CreateAuctionForm />);
    await userEvent.type(screen.getByLabelText('Title'), 'a'.repeat(81));
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');
    await userEvent.selectOptions(screen.getByLabelText('Condition'), 'good');
    await userEvent.selectOptions(screen.getByLabelText('Delivery method'), 'pickup');
    await userEvent.type(screen.getByLabelText('Price (COP)'), '50000');

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    expect(createAuction).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a title up to 80 characters/i)).toBeInTheDocument();
  });

  it('shows a server field error under the right field', async () => {
    vi.mocked(createAuction).mockRejectedValue(
      new ApiError('Validation failed', 400, { priceCOP: 'Too low' }),
    );
    render(<CreateAuctionForm />);
    await fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() => expect(screen.getByText('Too low')).toBeInTheDocument());
  });
});
