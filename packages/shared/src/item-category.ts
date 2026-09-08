export const ITEM_CATEGORIES = ['jeans', 'jackets', 'blouses', 'boots', 'sneakers'] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const ITEM_CATEGORY_SET = new Set<string>(ITEM_CATEGORIES);

export function isItemCategory(value: string): value is ItemCategory {
  return ITEM_CATEGORY_SET.has(value);
}
