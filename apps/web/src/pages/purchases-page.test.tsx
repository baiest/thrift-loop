import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PurchasesPage } from './purchases-page.js';
import { useAuthStore } from '../stores/auth-store.js';

vi.mock('../lib/api-client.js', async () => {
  const actual = await vi.importActual('../lib/api-client.js');
  return { ...actual, fetchCurrentUser: vi.fn(), fetchMyPurchases: vi.fn() };
});

const { fetchCurrentUser, fetchMyPurchases } = await import('../lib/api-client.js');

const sampleUser = {
  id: 'USR-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
  categoryPreference: null,
};

const publicPurchase = {
  auction: {
    id: 'AUC-1',
    userId: 'USR-seller',
    title: 'Chaqueta de cuero',
    description: 'Chaqueta de cuero en excelente estado.',
    category: 'jeans' as const,
    condition: 'good' as const,
    priceCOP: 50_000,
    publishAt: null,
    status: 'sold' as const,
    deliveryMethod: 'pickup' as const,
    photoUrls: [],
    currentBidCOP: 60_000,
    bidCount: 2,
    bidEndsAt: null,
    winnerUserId: 'USR-1',
    location: 'Medellín',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  handover: { mode: 'pickup' as const, city: 'Medellín' },
};

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/purchases']}>
      <Routes>
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/login" element={<p>login screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PurchasesPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser();
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(fetchMyPurchases).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /login when there is no session', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('login screen')).toBeInTheDocument();
  });

  it('shows an empty state when there are no purchases', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyPurchases).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText(/no purchases/i)).toBeInTheDocument();
  });

  it('shows a pickup purchase with the seller city', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyPurchases).mockResolvedValue([publicPurchase]);

    renderPage();

    expect(await screen.findByText(/60\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Medellín/)).toBeInTheDocument();
  });

  it('shows a shipping purchase with the address', async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(sampleUser);
    vi.mocked(fetchMyPurchases).mockResolvedValue([
      { ...publicPurchase, handover: { mode: 'delivery' as const, address: 'Calle 1' } },
    ]);

    renderPage();

    expect(await screen.findByText(/Calle 1/)).toBeInTheDocument();
  });
});
