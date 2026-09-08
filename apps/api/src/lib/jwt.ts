import jwt from 'jsonwebtoken';

const SESSION_TOKEN_EXPIRY = '7d';

export interface SessionPayload {
  userId: string;
}

function getSecret(): string {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_TOKEN_EXPIRY });
}

export function isSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return typeof (value as Record<string, unknown>)['userId'] === 'string';
}

export function verifySessionToken(token: string): SessionPayload | null {
  const secret = getSecret();
  try {
    const decoded: unknown = jwt.verify(token, secret);
    return isSessionPayload(decoded) ? { userId: decoded.userId } : null;
  } catch {
    return null;
  }
}
