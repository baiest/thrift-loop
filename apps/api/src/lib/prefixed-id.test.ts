import { describe, expect, it } from 'vitest';
import { createPrefixedId } from './prefixed-id.js';

describe('createPrefixedId', () => {
  it('prefixes the id with the given prefix and a dash', () => {
    const id = createPrefixedId('USR');
    expect(id.startsWith('USR-')).toBe(true);
  });

  it('appends a valid v4 uuid after the prefix', () => {
    const id = createPrefixedId('AUC');
    const uuidPart = id.slice('AUC-'.length);
    expect(uuidPart).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('generates a different id on each call', () => {
    expect(createPrefixedId('USR')).not.toBe(createPrefixedId('USR'));
  });
});
