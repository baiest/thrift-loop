import type { PublicUser } from '@thrift-loop/shared';

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
