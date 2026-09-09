import type { IncomingMessage } from 'node:http';
import { SESSION_COOKIE_NAME } from '../lib/cookies.js';
import { verifySessionToken } from '../lib/jwt.js';

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }
  for (const entry of cookieHeader.split(';')) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = entry.slice(0, separatorIndex).trim();
    if (key === name) {
      return decodeURIComponent(entry.slice(separatorIndex + 1).trim());
    }
  }
  return null;
}

/**
 * WebSocket upgrades are not covered by CORS, and the session cookie's
 * sameSite:'strict' is not honored by every browser/version — checking
 * Origin (when present) is a required second layer, not optional hardening.
 */
function isAllowedOrigin(origin: string | undefined, allowedOrigins: readonly string[]): boolean {
  return origin === undefined || allowedOrigins.includes(origin);
}

export function authenticateUpgrade(
  req: IncomingMessage,
  allowedOrigins: readonly string[],
): string | null {
  if (!isAllowedOrigin(req.headers.origin, allowedOrigins)) {
    return null;
  }
  const token = readCookie(req.headers.cookie, SESSION_COOKIE_NAME);
  if (!token) {
    return null;
  }
  return verifySessionToken(token)?.userId ?? null;
}
