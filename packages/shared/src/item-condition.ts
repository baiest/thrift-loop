export const ITEM_CONDITIONS = ['new', 'like-new', 'good', 'fair', 'worn'] as const;

export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

const ITEM_CONDITION_SET = new Set<string>(ITEM_CONDITIONS);

export function isItemCondition(value: string): value is ItemCondition {
  return ITEM_CONDITION_SET.has(value);
}
