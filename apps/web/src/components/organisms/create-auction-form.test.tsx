import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateAuctionForm } from './create-auction-form.js';
import {
  ApiError,
  createAuction,
  fetchCurrentUser,
  uploadAuctionPhotos,
} from '../../lib/api-client.js';

vi.mock('../../lib/api-client.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../lib/api-client.js')>('../../lib/api-client.js');
  return {
    ...actual,
    createAuction: vi.fn(),
    uploadAuctionPhotos: vi.fn(),
    fetchCurrentUser: vi.fn(),
  };
});

const createdAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
  title: 'Chaqueta de cuero',
  description: 'Chaqueta de cuero en excelente estado.',
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
  location: 'Bogotá D.C.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function fillRequiredFields(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Title'), 'Chaqueta de cuero');
  await userEvent.type(
    screen.getByLabelText('Description'),
    'Chaqueta de cuero en excelente estado.',
  );
  await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');
  await userEvent.selectOptions(screen.getByLabelText('Condition'), 'good');
  await userEvent.selectOptions(screen.getByLabelText('Delivery method'), 'pickup');
  await userEvent.type(screen.getByLabelText('Price (COP)'), '50000');

  const locationInput = screen.getByLabelText('Location');
  await userEvent.click(locationInput);
  await userEvent.type(locationInput, 'Bogotá');
  await userEvent.click(screen.getByText('Bogotá D.C.'));
}

describe('CreateAuctionForm', () => {
  beforeEach(() => {
    vi.mocked(createAuction).mockResolvedValue(createdAuction);
    vi.mocked(uploadAuctionPhotos).mockResolvedValue(createdAuction);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
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

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('AUC-1'));
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

  it('shows inline feedback when the description exceeds the max length', async () => {
    render(<CreateAuctionForm />);
    await fillRequiredFields();
    await userEvent.clear(screen.getByLabelText('Description'));
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'a'.repeat(501) },
    });

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    expect(createAuction).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a description up to 500 characters/i)).toBeInTheDocument();
  });

  it('defaults the location from the caller own city', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 'USR-1',
      firstName: 'Ana',
      lastName: 'Gómez',
      city: 'Medellín',
      country: 'CO',
      address: null,
      categoryPreference: null,
    });

    render(<CreateAuctionForm />);

    await waitFor(() => expect(screen.getByLabelText('Location')).toHaveValue('Medellín'));
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
