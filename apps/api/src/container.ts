import { join } from 'node:path';
import { JsonUserRepository } from './repositories/user.repository.json.js';
import { AuthService } from './services/auth.service.js';
import type { UserRepository } from './repositories/user.repository.js';

export interface Container {
  userRepository: UserRepository;
  authService: AuthService;
}

export function buildContainer(): Container {
  const dataFilePath = join(process.cwd(), 'data', 'users.json');
  const userRepository = new JsonUserRepository(dataFilePath);
  const authService = new AuthService(userRepository);
  return { userRepository, authService };
}
