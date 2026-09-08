import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store.js';

const sampleUser = {
  id: 'user-1',
  firstName: 'Ana',
  lastName: 'Gómez',
  city: 'Bogotá D.C.',
  country: 'CO' as const,
  address: null,
};

describe('useAuthStore', () => {
  afterEach(() => {
    useAuthStore.getState().clearUser();
  });

  it('starts with no user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setUser stores the given user', () => {
    useAuthStore.getState().setUser(sampleUser);
    expect(useAuthStore.getState().user).toEqual(sampleUser);
  });

  it('clearUser resets the user to null', () => {
    useAuthStore.getState().setUser(sampleUser);
    useAuthStore.getState().clearUser();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
