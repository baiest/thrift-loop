import { describe, expect, it } from 'vitest';
import { isColombianMobilePhone } from './phone.js';

describe('isColombianMobilePhone', () => {
  it.each(['3001234567', '3999999999', '3000000000'])('accepts %s', (phone) => {
    expect(isColombianMobilePhone(phone)).toBe(true);
  });

  it.each([
    ['2001234567', 'does not start with 3'],
    ['300123456', 'too short'],
    ['30012345678', 'too long'],
    ['300123456a', 'contains a letter'],
    ['', 'empty string'],
  ])('rejects %s (%s)', (phone) => {
    expect(isColombianMobilePhone(phone)).toBe(false);
  });
});
