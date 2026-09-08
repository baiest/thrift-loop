import { describe, expect, it } from 'vitest';
import { pickQueryStrings } from './query-params.js';

interface Filters {
  search: string;
  category: string;
}

describe('pickQueryStrings', () => {
  it('picks present string values', () => {
    expect(
      pickQueryStrings<Filters>({ search: 'jeans', category: 'jeans' }, ['search', 'category']),
    ).toEqual({
      search: 'jeans',
      category: 'jeans',
    });
  });

  it('omits keys that are absent', () => {
    expect(pickQueryStrings<Filters>({ search: 'jeans' }, ['search', 'category'])).toEqual({
      search: 'jeans',
    });
  });

  it('omits a key whose value is an array (parameter pollution)', () => {
    expect(pickQueryStrings<Filters>({ search: ['a', 'b'] }, ['search'])).toEqual({});
  });

  it('omits a key whose value is an object', () => {
    expect(pickQueryStrings<Filters>({ search: { nested: 'x' } }, ['search'])).toEqual({});
  });

  it('returns an empty object for an empty query', () => {
    expect(pickQueryStrings<Filters>({}, ['search', 'category'])).toEqual({});
  });

  it('handles an undefined query object', () => {
    expect(pickQueryStrings<Filters>(undefined, ['search'])).toEqual({});
  });
});
