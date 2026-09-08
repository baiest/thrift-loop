import { describe, expect, it } from 'vitest';
import { HttpError } from './http-error.js';

describe('HttpError', () => {
  it('is an instance of Error', () => {
    const error = new HttpError('Bad input', 400);
    expect(error).toBeInstanceOf(Error);
  });

  it('carries a status code', () => {
    const error = new HttpError('Not found', 404);
    expect(error.status).toBe(404);
  });

  it('carries the given message', () => {
    const error = new HttpError('Something specific', 400);
    expect(error.message).toBe('Something specific');
  });

  it('carries optional field errors', () => {
    const error = new HttpError('Validation failed', 400, { phone: 'Invalid phone' });
    expect(error.fields).toEqual({ phone: 'Invalid phone' });
  });

  it('has no fields when none are given', () => {
    const error = new HttpError('Not found', 404);
    expect(error.fields).toBeUndefined();
  });
});
