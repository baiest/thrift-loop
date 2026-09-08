import { randomBytes } from 'node:crypto';
import type { CookieOptions } from 'express';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const CSRF_TOKEN_BYTES = 32;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const CSRF_COOKIE_DAYS = 7;

export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_BYTES).toString('hex');
}

export function getCsrfCookieOptions(): CookieOptions {
  return {
    // Not httpOnly: the frontend must be able to read this value to send it
    // back as a header (double-submit cookie pattern).
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: CSRF_COOKIE_DAYS * SECONDS_PER_DAY * MILLISECONDS_PER_SECOND,
    path: '/',
  };
}
