import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSessionCookieOptions } from './cookies.js';

describe('getSessionCookieOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is not secure outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getSessionCookieOptions().secure).toBe(false);
  });

  it('is secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getSessionCookieOptions().secure).toBe(true);
  });

  it('is always httpOnly with sameSite lax', () => {
    const options = getSessionCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
  });
});
