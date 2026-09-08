export const DELIVERY_METHODS = ['pickup', 'delivery', 'both'] as const;

export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

const DELIVERY_METHOD_SET = new Set<string>(DELIVERY_METHODS);

export function isDeliveryMethod(value: string): value is DeliveryMethod {
  return DELIVERY_METHOD_SET.has(value);
}
