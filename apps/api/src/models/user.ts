import type { ItemCategory } from '@thrift-loop/shared';

export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  country: 'CO';
  passwordHash: string;
  address: string | null;
  categoryPreference: ItemCategory | null;
  createdAt: string;
  updatedAt: string;
}
