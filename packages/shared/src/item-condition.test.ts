import { describe, expect, it } from 'vitest';
import { ITEM_CONDITIONS, isItemCondition } from './item-condition.js';

describe('ITEM_CONDITIONS', () => {
  it('matches the four values the product brief specifies', () => {
    expect(ITEM_CONDITIONS).toEqual(['good', 'new-with-tag', 'unused', 'worn']);
  });
});

describe('isItemCondition', () => {
  it('accepts every condition in the curated list', () => {
    for (const condition of ITEM_CONDITIONS) {
      expect(isItemCondition(condition)).toBe(true);
    }
  });

  it('rejects a condition not in the list', () => {
    expect(isItemCondition('brand-new')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isItemCondition('')).toBe(false);
  });
});
