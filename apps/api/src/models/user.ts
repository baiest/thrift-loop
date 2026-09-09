import type { ItemCategory, NotificationPreferences } from '@thrift-loop/shared';

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
  notificationPreferences: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}
