import { describe, expect, it } from 'vitest';
import { DELIVERY_METHODS, isDeliveryMethod } from './delivery-method.js';

describe('isDeliveryMethod', () => {
  it('accepts every method in the list', () => {
    for (const method of DELIVERY_METHODS) {
      expect(isDeliveryMethod(method)).toBe(true);
    }
  });

  it('rejects a value not in the list', () => {
    expect(isDeliveryMethod('courier')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isDeliveryMethod('')).toBe(false);
  });
});
