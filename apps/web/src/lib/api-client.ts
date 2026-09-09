import type { PublicAuction, PublicBid, PublicPurchase, PublicUser } from '@thrift-loop/shared';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function readCsrfToken(): string {
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE_NAME.length + 1)) : '';
}

function csrfHeaders(): Record<string, string> {
  return { [CSRF_HEADER_NAME]: readCsrfToken() };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface AuthResponseBody {
  user?: PublicUser;
  error?: string;
  fields?: Record<string, string>;
}

async function postAuth(path: string, body: unknown): Promise<PublicUser> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as AuthResponseBody;
  if (!response.ok || !data.user) {
    throw new ApiError(data.error ?? 'Request failed', response.status, data.fields);
  }
  return data.user;
}

export interface RegisterPayload {
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  password: string;
  confirmPassword: string;
  categoryPreference: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export function register(payload: RegisterPayload): Promise<PublicUser> {
  return postAuth('/api/auth/register', payload);
}

export function login(payload: LoginPayload): Promise<PublicUser> {
  return postAuth('/api/auth/login', payload);
}

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'include' });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as AuthResponseBody;
  return data.user ?? null;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
  });
}

interface AuctionResponseBody {
  auction?: PublicAuction;
  auctions?: PublicAuction[];
  error?: string;
  fields?: Record<string, string>;
}

export interface CreateAuctionPayload {
  title: string;
  description: string;
  category: string;
  condition: string;
  deliveryMethod: string;
  priceCOP: string;
  publishAt: string;
  location: string;
}

export type UpdateAuctionPayload = Partial<CreateAuctionPayload> & { status?: string };

async function requestAuction(
  path: string,
  method: 'POST' | 'PATCH',
  body: unknown,
): Promise<PublicAuction> {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as AuctionResponseBody;
  if (!response.ok || !data.auction) {
    throw new ApiError(data.error ?? 'Request failed', response.status, data.fields);
  }
  return data.auction;
}

export function createAuction(payload: CreateAuctionPayload): Promise<PublicAuction> {
  return requestAuction('/api/auctions', 'POST', payload);
}

export function updateAuction(id: string, payload: UpdateAuctionPayload): Promise<PublicAuction> {
  return requestAuction(`/api/auctions/${id}`, 'PATCH', payload);
}

export async function deleteAuction(id: string): Promise<void> {
  await fetch(`/api/auctions/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: csrfHeaders(),
  });
}

export async function fetchMyAuctions(): Promise<PublicAuction[]> {
  const response = await fetch('/api/auctions/mine', { credentials: 'include' });
  const data = (await response.json()) as AuctionResponseBody;
  return data.auctions ?? [];
}

export async function fetchAuction(id: string): Promise<PublicAuction | null> {
  const response = await fetch(`/api/auctions/${id}`, { credentials: 'include' });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as AuctionResponseBody;
  return data.auction ?? null;
}

export interface AuctionFilters {
  search?: string;
  category?: string;
  city?: string;
  minPriceCOP?: string;
  maxPriceCOP?: string;
  sort?: string;
}

export async function fetchAuctions(filters: AuctionFilters = {}): Promise<PublicAuction[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value) {
      params.set(key, value);
    }
  }
  const query = params.toString();
  const path = query ? `/api/auctions?${query}` : '/api/auctions';
  const response = await fetch(path, { credentials: 'include' });
  const data = (await response.json()) as AuctionResponseBody;
  return data.auctions ?? [];
}

interface AuctionDetailResponseBody {
  auction?: PublicAuction;
  serverTime?: string;
}

export async function fetchAuctionDetail(
  id: string,
): Promise<{ auction: PublicAuction; serverTime: string } | null> {
  const response = await fetch(`/api/auctions/${id}`, { credentials: 'include' });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as AuctionDetailResponseBody;
  if (!data.auction || !data.serverTime) {
    return null;
  }
  return { auction: data.auction, serverTime: data.serverTime };
}

interface BidsResponseBody {
  bids?: PublicBid[];
}

export async function fetchBids(id: string): Promise<PublicBid[]> {
  const response = await fetch(`/api/auctions/${id}/bids`, { credentials: 'include' });
  const data = (await response.json()) as BidsResponseBody;
  return data.bids ?? [];
}

interface PlaceBidResponseBody {
  auction?: PublicAuction;
  bid?: PublicBid;
  error?: string;
  fields?: Record<string, string>;
}

export async function placeBid(
  id: string,
  amountCOP: number,
): Promise<{ auction: PublicAuction; bid: PublicBid }> {
  const response = await fetch(`/api/auctions/${id}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    credentials: 'include',
    body: JSON.stringify({ amountCOP: String(amountCOP) }),
  });

  const data = (await response.json()) as PlaceBidResponseBody;
  if (!response.ok || !data.auction || !data.bid) {
    throw new ApiError(data.error ?? 'Request failed', response.status, data.fields);
  }
  return { auction: data.auction, bid: data.bid };
}

interface PurchasesResponseBody {
  purchases?: PublicPurchase[];
}

export async function fetchMyPurchases(): Promise<PublicPurchase[]> {
  const response = await fetch('/api/auctions/purchases', { credentials: 'include' });
  const data = (await response.json()) as PurchasesResponseBody;
  return data.purchases ?? [];
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  city?: string;
  address?: string;
  categoryPreference?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<PublicUser> {
  const response = await fetch('/api/auth/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as AuthResponseBody;
  if (!response.ok || !data.user) {
    throw new ApiError(data.error ?? 'Request failed', response.status, data.fields);
  }
  return data.user;
}

export async function uploadAuctionPhotos(id: string, files: File[]): Promise<PublicAuction> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const response = await fetch(`/api/auctions/${id}/photos`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
    body: formData,
  });

  const data = (await response.json()) as AuctionResponseBody;
  if (!response.ok || !data.auction) {
    throw new ApiError(data.error ?? 'Upload failed', response.status, data.fields);
  }
  return data.auction;
}
