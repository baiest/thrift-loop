import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicUser } from '@thrift-loop/shared';
import { useLogout } from './use-logout.js';
import { useAuthStore } from '../stores/auth-store.js';
import * as apiClient from '../lib/api-client.js';

const SAMPLE_USER: PublicUser = {
  id: 'USR-1',
  firstName: 'Juan',
  lastName: 'Ballesteros',
  city: 'Bogotá D.C.',
  country: 'CO',
  address: null,
  categoryPreference: null,
  notificationPreferences: { outbid: true, auctionWon: true, bidOnMyListing: true },
};

describe('useLogout', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser(SAMPLE_USER);
  });

  afterEach(() => {
    useAuthStore.getState().clearUser();
    vi.restoreAllMocks();
  });

  it('calls the logout endpoint, clears the store, and navigates to /login', async () => {
    const logoutSpy = vi.spyOn(apiClient, 'logout').mockResolvedValue(undefined);
    const { result } = renderHook(() => useLogout(), { wrapper: MemoryRouter });

    await act(() => result.current());

    expect(logoutSpy).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
