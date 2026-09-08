import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSessionPayload, signSessionToken, verifySessionToken } from './jwt.js';

describe('signSessionToken / verifySessionToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('round-trips a valid token', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');

    const token = signSessionToken({ userId: 'user-1' });
    const payload = verifySessionToken(token);

    expect(payload).toEqual({ userId: 'user-1' });
  });

  it('returns null for a token signed with a different secret', () => {
    vi.stubEnv('JWT_SECRET', 'secret-a');
    const token = signSessionToken({ userId: 'user-1' });

    vi.stubEnv('JWT_SECRET', 'secret-b');
    expect(verifySessionToken(token)).toBeNull();
  });

  it('returns null for garbage input', () => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    expect(verifySessionToken('not-a-jwt')).toBeNull();
  });

  it('throws when JWT_SECRET is missing on sign', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => signSessionToken({ userId: 'user-1' })).toThrow(/JWT_SECRET/);
  });

  it('throws when JWT_SECRET is missing on verify', () => {
    vi.stubEnv('JWT_SECRET', '');
    expect(() => verifySessionToken('anything')).toThrow(/JWT_SECRET/);
  });
});

describe('isSessionPayload', () => {
  it('rejects null', () => {
    expect(isSessionPayload(null)).toBe(false);
  });

  it('rejects a non-object value', () => {
    expect(isSessionPayload('just-a-string')).toBe(false);
  });

  it('rejects an object without a string userId', () => {
    expect(isSessionPayload({ userId: 42 })).toBe(false);
  });

  it('accepts an object with a string userId', () => {
    expect(isSessionPayload({ userId: 'user-1' })).toBe(true);
  });
});
