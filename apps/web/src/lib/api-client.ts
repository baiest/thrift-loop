import type { PublicAuction, PublicUser } from '@thrift-loop/shared';

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
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}

interface AuctionResponseBody {
  auction?: PublicAuction;
  auctions?: PublicAuction[];
  error?: string;
  fields?: Record<string, string>;
}

export interface CreateAuctionPayload {
  category: string;
  condition: string;
  deliveryMethod: string;
  priceCOP: string;
  publishAt: string;
}

export type UpdateAuctionPayload = Partial<CreateAuctionPayload> & { status?: string };

async function requestAuction(
  path: string,
  method: 'POST' | 'PATCH',
  body: unknown,
): Promise<PublicAuction> {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
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
  await fetch(`/api/auctions/${id}`, { method: 'DELETE', credentials: 'include' });
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

export async function uploadAuctionPhotos(id: string, files: File[]): Promise<PublicAuction> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('photos', file);
  }

  const response = await fetch(`/api/auctions/${id}/photos`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = (await response.json()) as AuctionResponseBody;
  if (!response.ok || !data.auction) {
    throw new ApiError(data.error ?? 'Upload failed', response.status, data.fields);
  }
  return data.auction;
}
