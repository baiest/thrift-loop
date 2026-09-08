import { describe, expect, it } from 'vitest';
import { resolveHandover } from './purchase.js';

describe('resolveHandover', () => {
  it('ships to the winner address when they have one and delivery is allowed', () => {
    expect(resolveHandover('Calle 1', 'delivery', 'Bogotá D.C.')).toEqual({
      mode: 'delivery',
      address: 'Calle 1',
    });
  });

  it('ships when the delivery method is both', () => {
    expect(resolveHandover('Calle 1', 'both', 'Bogotá D.C.')).toEqual({
      mode: 'delivery',
      address: 'Calle 1',
    });
  });

  it('falls back to pickup at the seller city when the winner has no address', () => {
    expect(resolveHandover(null, 'delivery', 'Medellín')).toEqual({
      mode: 'pickup',
      city: 'Medellín',
    });
  });

  it('falls back to pickup when the auction is pickup-only, even with an address', () => {
    expect(resolveHandover('Calle 1', 'pickup', 'Medellín')).toEqual({
      mode: 'pickup',
      city: 'Medellín',
    });
  });
});
