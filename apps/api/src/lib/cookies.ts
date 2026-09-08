import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'session';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const SESSION_COOKIE_DAYS = 7;

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: SESSION_COOKIE_DAYS * SECONDS_PER_DAY * MILLISECONDS_PER_SECOND,
    path: '/',
  };
}
