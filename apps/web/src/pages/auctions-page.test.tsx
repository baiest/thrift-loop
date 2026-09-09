import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuctionsPage } from './auctions-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchAuctions: vi.fn(), fetchCurrentUser: vi.fn() };
});

const { fetchAuctions, fetchCurrentUser } = await import('../lib/api-client.js');

const publicAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
  title: 'Chaqueta de cuero',
  category: 'jeans' as const,
  condition: 'good' as const,
  priceCOP: 50_000,
  publishAt: null,
  status: 'published' as const,
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

function renderPage(): void {
  render(
    <MemoryRouter>
      <AuctionsPage />
    </MemoryRouter>,
  );
}

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Cali',
  country: 'CO' as const,
  address: null,
};

describe('AuctionsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchAuctions).mockReset();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchAuctions).mockResolvedValue([]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the auctions without requiring a session', async () => {
    vi.mocked(fetchAuctions).mockResolvedValue([publicAuction]);
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByRole('link')).toBeInTheDocument();
  });

  it('shows an empty state when there are no auctions', async () => {
    renderPage();

    expect(await screen.findByText(/no auctions/i)).toBeInTheDocument();
  });

  it('renders the filter bar', async () => {
    renderPage();

    expect(await screen.findByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Min price (COP)')).toBeInTheDocument();
    expect(screen.getByLabelText('Max price (COP)')).toBeInTheDocument();
  });

  it('defaults the city filter to the logged-in user own city', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);

    renderPage();

    expect(await screen.findByLabelText('City')).toHaveValue('Cali');
    await vi.waitFor(() =>
      expect(fetchAuctions).toHaveBeenCalledWith(expect.objectContaining({ city: 'Cali' })),
    );
  });

  it('debounces the search box before fetching', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderPage();
    await vi.waitFor(() => expect(fetchAuctions).toHaveBeenCalledTimes(1));
    vi.mocked(fetchAuctions).mockClear();

    const search = await screen.findByLabelText('Search');
    act(() => {
      fireEvent.change(search, { target: { value: 'c' } });
      fireEvent.change(search, { target: { value: 'ch' } });
      fireEvent.change(search, { target: { value: 'cha' } });
    });

    expect(fetchAuctions).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fetchAuctions).toHaveBeenCalledTimes(1);
    expect(fetchAuctions).toHaveBeenCalledWith(expect.objectContaining({ search: 'cha' }));
    vi.useRealTimers();
  });
});
