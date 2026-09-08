import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createAuction,
  deleteAuction,
  fetchAuction,
  fetchAuctionDetail,
  fetchAuctions,
  fetchBids,
  fetchCurrentUser,
  fetchMyAuctions,
  fetchMyPurchases,
  login,
  logout,
  placeBid,
  register,
  updateAuction,
  updateProfile,
  uploadAuctionPhotos,
} from './api-client.js';

const publicAuction = {
  id: 'AUC-1',
  userId: 'USR-1',
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

const publicUser = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
};

const publicBid = {
  id: 'BID-1',
  auctionId: 'AUC-1',
  bidderId: 'USR-2',
  bidderFirstName: 'Ana',
  amountCOP: 50_000,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const publicPurchase = {
  auction: publicAuction,
  handover: { mode: 'pickup' as const, city: 'Bogotá D.C.' },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest's objectContaining typing widens to `any`
const csrfHeaderMatcher: Record<string, string> = expect.objectContaining({
  'x-csrf-token': 'test-csrf-token',
});

function mockFetchOnce(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('api-client', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    document.cookie = 'csrf_token=test-csrf-token';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });

  it('register resolves with the public user on success', async () => {
    mockFetchOnce(201, { user: publicUser });
    await expect(register({} as never)).resolves.toEqual(publicUser);
  });

  it('register calls a relative /api path, not an absolute URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ user: publicUser }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await register({} as never);

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.anything());
  });

  it('register throws ApiError with fields on validation failure', async () => {
    mockFetchOnce(400, { error: 'Validation failed', fields: { phone: 'Invalid' } });

    await expect(register({} as never)).rejects.toMatchObject({
      status: 400,
      fields: { phone: 'Invalid' },
    });
  });

  it('login resolves with the public user on success', async () => {
    mockFetchOnce(200, { user: publicUser });
    await expect(login({} as never)).resolves.toEqual(publicUser);
  });

  it('login throws a generic ApiError on wrong credentials', async () => {
    mockFetchOnce(401, { error: 'Phone number or password is incorrect' });

    await expect(login({} as never)).rejects.toBeInstanceOf(ApiError);
  });

  it('fetchCurrentUser resolves with the user when authenticated', async () => {
    mockFetchOnce(200, { user: publicUser });
    await expect(fetchCurrentUser()).resolves.toEqual(publicUser);
  });

  it('fetchCurrentUser resolves with null when not authenticated', async () => {
    mockFetchOnce(401, { error: 'Not authenticated' });
    await expect(fetchCurrentUser()).resolves.toBeNull();
  });

  it('fetchCurrentUser calls a relative /api path, not an absolute URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: publicUser }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchCurrentUser();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('logout calls the logout endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    await logout();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaderMatcher,
      }),
    );
  });

  it('createAuction posts to /api/auctions and resolves with the auction', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ auction: publicAuction }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(createAuction({} as never)).resolves.toEqual(publicAuction);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auctions',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaderMatcher,
      }),
    );
  });

  it('createAuction throws ApiError with fields on validation failure', async () => {
    mockFetchOnce(400, { error: 'Validation failed', fields: { category: 'Invalid' } });
    await expect(createAuction({} as never)).rejects.toMatchObject({
      status: 400,
      fields: { category: 'Invalid' },
    });
  });

  it('updateAuction patches /api/auctions/:id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ auction: publicAuction }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await updateAuction('AUC-1', { priceCOP: '75000' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auctions/AUC-1',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        headers: csrfHeaderMatcher,
      }),
    );
  });

  it('deleteAuction calls DELETE on /api/auctions/:id', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 204, json: () => Promise.resolve({}) });
    vi.stubGlobal('fetch', fetchMock);

    await deleteAuction('AUC-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auctions/AUC-1',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaderMatcher,
      }),
    );
  });

  it('fetchMyAuctions resolves with the list of the caller own auctions', async () => {
    mockFetchOnce(200, { auctions: [publicAuction] });
    await expect(fetchMyAuctions()).resolves.toEqual([publicAuction]);
  });

  it('fetchAuction resolves with a single auction', async () => {
    mockFetchOnce(200, { auction: publicAuction });
    await expect(fetchAuction('AUC-1')).resolves.toEqual(publicAuction);
  });

  it('uploadAuctionPhotos posts multipart form data without a manual Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ auction: publicAuction }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    await uploadAuctionPhotos('AUC-1', [file]);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auctions/AUC-1/photos');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('include');
    expect(options.body).toBeInstanceOf(FormData);
    const headers = options.headers as Record<string, string> | undefined;
    expect(headers?.['Content-Type']).toBeUndefined();
    expect(headers?.['x-csrf-token']).toBe('test-csrf-token');
  });

  it('fetchAuctions resolves with the list of published auctions', async () => {
    mockFetchOnce(200, { auctions: [publicAuction] });
    await expect(fetchAuctions()).resolves.toEqual([publicAuction]);
  });

  it('fetchAuctions calls a relative /api path with no session required', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ auctions: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchAuctions();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auctions',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('fetchAuctionDetail resolves with the auction and serverTime', async () => {
    mockFetchOnce(200, { auction: publicAuction, serverTime: '2026-01-01T00:00:05.000Z' });

    await expect(fetchAuctionDetail('AUC-1')).resolves.toEqual({
      auction: publicAuction,
      serverTime: '2026-01-01T00:00:05.000Z',
    });
  });

  it('fetchAuctionDetail resolves with null when the auction is not found', async () => {
    mockFetchOnce(404, { error: 'Auction not found' });
    await expect(fetchAuctionDetail('AUC-missing')).resolves.toBeNull();
  });

  it('fetchBids resolves with the bid history', async () => {
    mockFetchOnce(200, { bids: [publicBid] });
    await expect(fetchBids('AUC-1')).resolves.toEqual([publicBid]);
  });

  it('placeBid posts to /api/auctions/:id/bids with the CSRF header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ auction: publicAuction, bid: publicBid }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(placeBid('AUC-1', 50_000)).resolves.toEqual({
      auction: publicAuction,
      bid: publicBid,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auctions/AUC-1/bids',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaderMatcher,
        body: JSON.stringify({ amountCOP: '50000' }),
      }),
    );
  });

  it('placeBid throws ApiError with fields on an invalid amount', async () => {
    mockFetchOnce(400, { error: 'Validation failed', fields: { amountCOP: 'Too low' } });
    await expect(placeBid('AUC-1', 1)).rejects.toMatchObject({
      status: 400,
      fields: { amountCOP: 'Too low' },
    });
  });

  it('fetchMyPurchases resolves with the caller purchases', async () => {
    mockFetchOnce(200, { purchases: [publicPurchase] });
    await expect(fetchMyPurchases()).resolves.toEqual([publicPurchase]);
  });

  it('updateProfile patches /api/auth/me with the CSRF header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: { ...publicUser, address: 'Calle 1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateProfile({ address: 'Calle 1' })).resolves.toEqual({
      ...publicUser,
      address: 'Calle 1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        headers: csrfHeaderMatcher,
      }),
    );
  });
});
