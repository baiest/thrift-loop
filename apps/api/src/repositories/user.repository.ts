import type { User } from '../models/user.js';

export type UserPatch = Partial<
  Pick<
    User,
    'address' | 'categoryPreference' | 'firstName' | 'lastName' | 'city' | 'notificationPreferences'
  >
>;

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  update(id: string, patch: UserPatch): Promise<User | null>;
}
