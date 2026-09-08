import { join } from 'node:path';
import { createJsonUserRepository } from './repositories/user.repository.json.js';
import { createJsonAuctionRepository } from './repositories/auction.repository.json.js';
import { createAuthService, type AuthService } from './services/auth.service.js';
import { createAuctionService, type AuctionService } from './services/auction.service.js';
import { createLocalPhotoStorage } from './lib/photo-storage.js';
import type { UserRepository } from './repositories/user.repository.js';
import type { AuctionRepository } from './repositories/auction.repository.js';

export interface Container {
  userRepository: UserRepository;
  authService: AuthService;
  auctionRepository: AuctionRepository;
  auctionService: AuctionService;
  uploadsDir: string;
}

export function buildContainer(): Container {
  const dataDir = join(process.cwd(), 'data');
  const uploadsDir = join(dataDir, 'uploads');

  const userRepository = createJsonUserRepository(join(dataDir, 'users.json'));
  const authService = createAuthService(userRepository);

  const auctionRepository = createJsonAuctionRepository(join(dataDir, 'auctions.json'));
  const photoStorage = createLocalPhotoStorage(uploadsDir);
  const auctionService = createAuctionService(auctionRepository, photoStorage);

  return { userRepository, authService, auctionRepository, auctionService, uploadsDir };
}
