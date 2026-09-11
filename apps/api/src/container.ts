import { join } from 'node:path';
import { createJsonUserRepository } from './repositories/user.repository.json.js';
import { createJsonAuctionRepository } from './repositories/auction.repository.json.js';
import { createJsonBidRepository } from './repositories/bid.repository.json.js';
import { createJsonNotificationRepository } from './repositories/notification.repository.json.js';
import { createAuthService, type AuthService } from './services/auth.service.js';
import { createAuctionService, type AuctionService } from './services/auction.service.js';
import { createBidService, type BidService } from './services/bid.service.js';
import {
  createNotificationService,
  type NotificationService,
} from './services/notification.service.js';
import { createLocalPhotoStorage } from './lib/photo-storage.js';
import { createKeyedMutex, type KeyedMutex } from './lib/keyed-mutex.js';
import { createEventBus, type EventBus } from './lib/event-bus.js';
import { createLogger, type Logger } from './lib/logger.js';
import type { UserRepository } from './repositories/user.repository.js';
import type { AuctionRepository } from './repositories/auction.repository.js';
import type { BidRepository } from './repositories/bid.repository.js';
import type { NotificationRepository } from './repositories/notification.repository.js';

export interface Container {
  userRepository: UserRepository;
  authService: AuthService;
  auctionRepository: AuctionRepository;
  auctionService: AuctionService;
  bidRepository: BidRepository;
  bidService: BidService;
  notificationRepository: NotificationRepository;
  notificationService: NotificationService;
  // Shared with the auction scheduler so a bid can never land in the same
  // instant an auction closes — see lib/keyed-mutex.ts and lib/publish-scheduler.ts.
  mutex: KeyedMutex;
  eventBus: EventBus;
  uploadsDir: string;
  logger: Logger;
}

export function buildContainer(): Container {
  const dataDir = join(process.cwd(), 'data');
  const uploadsDir = join(dataDir, 'uploads');
  const logger = createLogger(join(dataDir, 'logs', 'app.jsonl'));

  const userRepository = createJsonUserRepository(join(dataDir, 'users.json'));
  const authService = createAuthService(userRepository, logger);

  const auctionRepository = createJsonAuctionRepository(join(dataDir, 'auctions.json'));
  const photoStorage = createLocalPhotoStorage(uploadsDir);

  const bidRepository = createJsonBidRepository(join(dataDir, 'bids.json'));
  const mutex = createKeyedMutex();
  const eventBus = createEventBus(logger);
  const auctionService = createAuctionService(auctionRepository, photoStorage, logger, {
    bidRepository,
    mutex,
    eventBus,
  });
  const bidService = createBidService(
    auctionRepository,
    bidRepository,
    userRepository,
    mutex,
    eventBus,
    logger,
  );

  const notificationRepository = createJsonNotificationRepository(
    join(dataDir, 'notifications.json'),
  );
  const notificationService = createNotificationService(
    notificationRepository,
    userRepository,
    logger,
  );

  return {
    userRepository,
    authService,
    auctionRepository,
    auctionService,
    bidRepository,
    bidService,
    notificationRepository,
    notificationService,
    mutex,
    eventBus,
    uploadsDir,
    logger,
  };
}
