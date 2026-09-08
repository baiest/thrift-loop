import { describe, expect, it, vi } from 'vitest';
import { generateCsrfToken, getCsrfCookieOptions } from './csrf.js';

describe('generateCsrfToken', () => {
  it('generates a non-empty token', () => {
    expect(generateCsrfToken().length).toBeGreaterThan(0);
  });

  it('generates a different token on each call', () => {
    expect(generateCsrfToken()).not.toBe(generateCsrfToken());
  });
});

describe('getCsrfCookieOptions', () => {
  it('is not httpOnly, so the frontend can read it', () => {
    expect(getCsrfCookieOptions().httpOnly).toBe(false);
  });

  it('is not secure outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(getCsrfCookieOptions().secure).toBe(false);
    vi.unstubAllEnvs();
  });

  it('is secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(getCsrfCookieOptions().secure).toBe(true);
    vi.unstubAllEnvs();
  });

  it('is sameSite strict', () => {
    expect(getCsrfCookieOptions().sameSite).toBe('strict');
  });
});
