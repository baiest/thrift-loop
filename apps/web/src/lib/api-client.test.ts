import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, fetchCurrentUser, login, logout, register } from './api-client.js';

const publicUser = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
};

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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });
});
