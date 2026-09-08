import { join } from 'node:path';
import { createJsonUserRepository } from './repositories/user.repository.json.js';
import { createAuthService, type AuthService } from './services/auth.service.js';
import type { UserRepository } from './repositories/user.repository.js';

export interface Container {
  userRepository: UserRepository;
  authService: AuthService;
}

export function buildContainer(): Container {
  const dataFilePath = join(process.cwd(), 'data', 'users.json');
  const userRepository = createJsonUserRepository(dataFilePath);
  const authService = createAuthService(userRepository);
  return { userRepository, authService };
}
