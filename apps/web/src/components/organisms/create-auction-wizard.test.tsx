import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateAuctionWizard } from './create-auction-wizard.js';
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

async function goToDetails(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

async function fillDetailsAndContinue(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Title'), 'Chaqueta de cuero');
  await userEvent.type(
    screen.getByLabelText('Description'),
    'Chaqueta de cuero en excelente estado.',
  );
  await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');
  await userEvent.selectOptions(screen.getByLabelText('Condition'), 'good');
  await userEvent.selectOptions(screen.getByLabelText('Delivery method'), 'pickup');

  const locationInput = screen.getByLabelText('Location');
  await userEvent.click(locationInput);
  await userEvent.type(locationInput, 'Bogotá');
  await userEvent.click(screen.getByText('Bogotá D.C.'));

  await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

async function fillPricingAndContinue(): Promise<void> {
  await userEvent.type(screen.getByLabelText('Price (COP)'), '50000');
  await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

async function skipScheduleStep(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /continue/i }));
}

async function advanceThroughToReview(): Promise<void> {
  await goToDetails();
  await fillDetailsAndContinue();
  await fillPricingAndContinue();
  await skipScheduleStep();
}

describe('CreateAuctionWizard', () => {
  beforeEach(() => {
    vi.mocked(createAuction).mockResolvedValue(createdAuction);
    vi.mocked(uploadAuctionPhotos).mockResolvedValue(createdAuction);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts on the Photos step with a 5-step progress indicator', () => {
    render(<CreateAuctionWizard />);
    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByLabelText(/add photos/i)).toBeInTheDocument();
  });

  it('does not block Continue on the Photos step (no fields to validate)', async () => {
    render(<CreateAuctionWizard />);

    await goToDetails();

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('blocks Continue on the Details step until its required fields are valid', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
  });

  it('does not block Details on invalid fields belonging to a later step', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await fillDetailsAndContinue();

    expect(screen.getByLabelText('Price (COP)')).toBeInTheDocument();
  });

  it('reaches the review step and submits with the entered values', async () => {
    render(<CreateAuctionWizard />);
    await advanceThroughToReview();

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
    render(<CreateAuctionWizard onSuccess={onSuccess} />);
    await advanceThroughToReview();

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('AUC-1'));
    expect(uploadAuctionPhotos).not.toHaveBeenCalled();
  });

  it('uploads photos added on the Photos step after creating the auction', async () => {
    render(<CreateAuctionWizard />);
    const file = new File(['x'], 'front.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText(/add photos/i), file);
    await advanceThroughToReview();

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() =>
      expect(uploadAuctionPhotos).toHaveBeenCalledWith('AUC-1', [
        expect.objectContaining({ name: 'front.jpg' }),
      ]),
    );
  });

  it('shows the entered price formatted as currency while typing', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await fillDetailsAndContinue();

    await userEvent.type(screen.getByLabelText('Price (COP)'), '50000');

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc disagrees with the linter here; the cast is required to access `.value`.
    const priceInput = screen.getByLabelText('Price (COP)') as HTMLInputElement;
    expect(priceInput.value).toMatch(/\$\s?50\.000/);
  });

  it('shows inline feedback when the title exceeds the max length', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await userEvent.type(screen.getByLabelText('Title'), 'a'.repeat(81));

    await userEvent.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/enter a title up to 80 characters/i)).toBeInTheDocument();
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

    render(<CreateAuctionWizard />);
    await goToDetails();

    await waitFor(() => expect(screen.getByLabelText('Location')).toHaveValue('Medellín'));
  });

  it('routes a server field error back to the step that owns the field', async () => {
    vi.mocked(createAuction).mockRejectedValue(
      new ApiError('Validation failed', 400, { priceCOP: 'Too low' }),
    );
    render(<CreateAuctionWizard />);
    await advanceThroughToReview();

    await userEvent.click(screen.getByRole('button', { name: /create auction/i }));

    await waitFor(() => expect(screen.getByText('Too low')).toBeInTheDocument());
    expect(screen.getByLabelText('Price (COP)')).toBeInTheDocument();
  });

  it('can navigate back to an earlier step from Review', async () => {
    render(<CreateAuctionWizard />);
    await advanceThroughToReview();

    await userEvent.click(screen.getByRole('button', { name: /edit details/i }));

    expect(screen.getByLabelText('Title')).toHaveValue('Chaqueta de cuero');
  });

  it('defaults the schedule step to "Publish now" with the calendar hidden', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await fillDetailsAndContinue();
    await fillPricingAndContinue();

    expect(screen.getByRole('radio', { name: /publish now/i })).toBeChecked();
    expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument();
  });

  it('shows the calendar after choosing "Schedule for later"', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await fillDetailsAndContinue();
    await fillPricingAndContinue();

    await userEvent.click(screen.getByRole('radio', { name: /schedule for later/i }));

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
  });

  it('disables dates before today once the calendar is shown', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await fillDetailsAndContinue();
    await fillPricingAndContinue();
    await userEvent.click(screen.getByRole('radio', { name: /schedule for later/i }));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getMonth() === new Date().getMonth()) {
      expect(screen.getByRole('button', { name: String(yesterday.getDate()) })).toBeDisabled();
    }
  });

  it('switching back to "Publish now" hides the calendar again', async () => {
    render(<CreateAuctionWizard />);
    await goToDetails();
    await fillDetailsAndContinue();
    await fillPricingAndContinue();
    await userEvent.click(screen.getByRole('radio', { name: /schedule for later/i }));

    await userEvent.click(screen.getByRole('radio', { name: /publish now/i }));

    expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument();
  });
});
