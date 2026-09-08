import type { DeliveryMethod } from './delivery-method.js';
import type { PublicAuction } from './auction.js';

export type Handover = { mode: 'delivery'; address: string } | { mode: 'pickup'; city: string };

export interface PublicPurchase {
  auction: PublicAuction;
  handover: Handover;
}

export function resolveHandover(
  winnerAddress: string | null,
  deliveryMethod: DeliveryMethod,
  sellerCity: string,
): Handover {
  const allowsDelivery = deliveryMethod === 'delivery' || deliveryMethod === 'both';
  if (winnerAddress !== null && allowsDelivery) {
    return { mode: 'delivery', address: winnerAddress };
  }
  return { mode: 'pickup', city: sellerCity };
}
