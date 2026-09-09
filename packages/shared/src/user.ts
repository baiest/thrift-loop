import type { ItemCategory } from './item-category.js';

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  country: 'CO';
  address: string | null;
  categoryPreference: ItemCategory | null;
}
