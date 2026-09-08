import { describe, expect, it } from 'vitest';
import { COLOMBIA_CITIES, isColombiaCity } from './colombia-cities.js';

describe('isColombiaCity', () => {
  it('accepts every city in the curated list', () => {
    for (const city of COLOMBIA_CITIES) {
      expect(isColombiaCity(city)).toBe(true);
    }
  });

  it('rejects a city not in the list', () => {
    expect(isColombiaCity('Miami')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isColombiaCity('')).toBe(false);
  });
});
