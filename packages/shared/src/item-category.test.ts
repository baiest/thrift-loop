import { describe, expect, it } from 'vitest';
import { ITEM_CATEGORIES, isItemCategory } from './item-category.js';

describe('isItemCategory', () => {
  it('accepts every category in the curated list', () => {
    for (const category of ITEM_CATEGORIES) {
      expect(isItemCategory(category)).toBe(true);
    }
  });

  it('rejects a category not in the list', () => {
    expect(isItemCategory('hats')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isItemCategory('')).toBe(false);
  });
});
