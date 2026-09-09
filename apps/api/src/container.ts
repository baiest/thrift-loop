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
}

export function buildContainer(): Container {
  const dataDir = join(process.cwd(), 'data');
  const uploadsDir = join(dataDir, 'uploads');

  const userRepository = createJsonUserRepository(join(dataDir, 'users.json'));
  const authService = createAuthService(userRepository);

  const auctionRepository = createJsonAuctionRepository(join(dataDir, 'auctions.json'));
  const photoStorage = createLocalPhotoStorage(uploadsDir);
  const auctionService = createAuctionService(auctionRepository, photoStorage);

  const bidRepository = createJsonBidRepository(join(dataDir, 'bids.json'));
  const mutex = createKeyedMutex();
  const eventBus = createEventBus();
  const bidService = createBidService(
    auctionRepository,
    bidRepository,
    userRepository,
    mutex,
    eventBus,
  );

  const notificationRepository = createJsonNotificationRepository(
    join(dataDir, 'notifications.json'),
  );
  const notificationService = createNotificationService(notificationRepository, userRepository);
  // Temporary direct wiring until PR 2 introduces the WebSocket hub and
  // replaces this with realtime/event-fanout.ts.
  eventBus.subscribe((event) => {
    notificationService.recordForEvent(event).catch((error: unknown) => {
      console.error('Failed to record notification for event', error);
    });
  });

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
  };
}
