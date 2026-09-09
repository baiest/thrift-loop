// Bueno, Nuevo con etiqueta, Sin usar, Con desgaste.
export const ITEM_CONDITIONS = ['good', 'new-with-tag', 'unused', 'worn'] as const;

export type ItemCondition = (typeof ITEM_CONDITIONS)[number];

const ITEM_CONDITION_SET = new Set<string>(ITEM_CONDITIONS);

export function isItemCondition(value: string): value is ItemCondition {
  return ITEM_CONDITION_SET.has(value);
}
