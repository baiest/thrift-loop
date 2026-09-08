import type { User } from '../models/user.js';

export interface UserRepository {
  findByPhone(phone: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
