import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  isAllowedPhotoMimeType,
  MAX_PHOTOS_PER_AUCTION,
  MAX_PHOTO_SIZE_BYTES,
  resolveHandover,
  type PublicAuction,
  type PublicPurchase,
} from '@thrift-loop/shared';
import { HTTP_STATUS } from '../lib/http-status.js';
import { HttpError } from '../lib/http-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { pickPresentStringFields, pickStringFields } from '../lib/request-body.js';
import { pickQueryStrings } from '../lib/query-params.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { requireCsrf } from '../middlewares/require-csrf.js';
import { optionalAuth } from '../middlewares/optional-auth.js';
import type { Auction } from '../models/auction.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type {
  AuctionSearchInput,
  AuctionService,
  CreateAuctionInput,
  UpdateAuctionInput,
} from '../services/auction.service.js';
import type { BidService } from '../services/bid.service.js';

const CREATE_FIELDS = [
  'title',
  'category',
  'condition',
  'deliveryMethod',
  'priceCOP',
  'publishAt',
] as const satisfies readonly (keyof CreateAuctionInput)[];

const UPDATE_FIELDS = [
  ...CREATE_FIELDS,
  'status',
] as const satisfies readonly (keyof UpdateAuctionInput)[];

const SEARCH_FIELDS = [
  'search',
  'category',
  'city',
  'minPriceCOP',
  'maxPriceCOP',
] as const satisfies readonly (keyof AuctionSearchInput)[];

const INVALID_FILE_TYPE_MESSAGE = `Only ${ALLOWED_PHOTO_MIME_TYPES.join(', ')} files are allowed`;
const BIDDING_NOT_AVAILABLE_MESSAGE = 'Bidding is not available';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES, files: MAX_PHOTOS_PER_AUCTION },
  fileFilter: (_req, file, callback) => {
    if (isAllowedPhotoMimeType(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error(INVALID_FILE_TYPE_MESSAGE));
  },
});

async function toPublicAuction(
  auction: Auction,
  userRepository: UserRepository,
): Promise<PublicAuction> {
  const seller = await userRepository.findById(auction.userId);
  return {
    id: auction.id,
    userId: auction.userId,
    title: auction.title,
    category: auction.category,
    condition: auction.condition,
    priceCOP: auction.priceCOP,
    publishAt: auction.publishAt,
    status: auction.status,
    deliveryMethod: auction.deliveryMethod,
    photoUrls: auction.photoKeys.map((key) => `/uploads/${key}`),
    currentBidCOP: auction.currentBidCOP,
    bidCount: auction.bidCount,
    bidEndsAt: auction.bidEndsAt,
    winnerUserId: auction.winnerUserId,
    sellerCity: seller?.city ?? '',
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
  };
}

function runUpload(req: Request, res: Response): Promise<void> {
  const middleware = upload.array('photos', MAX_PHOTOS_PER_AUCTION);
  return new Promise((resolve, reject) => {
    middleware(req, res, (error: unknown) => {
      if (error) {
        reject(error instanceof Error ? error : new Error('Invalid upload'));
        return;
      }
      resolve();
    });
  });
}

function getViewerId(res: Response): string | null {
  const userId: unknown = res.locals['userId'];
  return typeof userId === 'string' ? userId : null;
}

function requireBidService(bidService: BidService | undefined): BidService {
  if (!bidService) {
    throw new HttpError(BIDDING_NOT_AVAILABLE_MESSAGE, HTTP_STATUS.NOT_FOUND);
  }
  return bidService;
}

export function createAuctionRouter(
  auctionService: AuctionService,
  userRepository: UserRepository,
  bidService?: BidService,
): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const input = pickQueryStrings<AuctionSearchInput>(req.query, SEARCH_FIELDS);
      const auctions = await auctionService.listPublishedAuctions(input);
      const publicAuctions = await Promise.all(
        auctions.map((auction) => toPublicAuction(auction, userRepository)),
      );
      res.status(HTTP_STATUS.OK).json({ auctions: publicAuctions });
    }),
  );

  router.post(
    '/',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const input = pickStringFields<CreateAuctionInput>(req.body, CREATE_FIELDS);
      const auction = await auctionService.createAuction(userId, input);
      res
        .status(HTTP_STATUS.CREATED)
        .json({ auction: await toPublicAuction(auction, userRepository) });
    }),
  );

  router.get(
    '/mine',
    requireAuth,
    asyncHandler(async (_req, res) => {
      const userId = res.locals['userId'] as string;
      const auctions = await auctionService.listMyAuctions(userId);
      const publicAuctions = await Promise.all(
        auctions.map((auction) => toPublicAuction(auction, userRepository)),
      );
      res.status(HTTP_STATUS.OK).json({ auctions: publicAuctions });
    }),
  );

  router.get(
    '/purchases',
    requireAuth,
    asyncHandler(async (_req, res) => {
      const userId = res.locals['userId'] as string;
      const buyer = await userRepository.findById(userId);
      const auctions = await auctionService.listMyPurchases(userId);
      const purchases: PublicPurchase[] = await Promise.all(
        auctions.map(async (auction) => {
          const publicAuction = await toPublicAuction(auction, userRepository);
          const handover = resolveHandover(
            buyer?.address ?? null,
            auction.deliveryMethod,
            publicAuction.sellerCity,
          );
          return { auction: publicAuction, handover };
        }),
      );
      res.status(HTTP_STATUS.OK).json({ purchases });
    }),
  );

  router.get(
    '/:id',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const auction = await auctionService.getAuctionForViewer(
        getViewerId(res),
        req.params['id'] as string,
      );
      res.status(HTTP_STATUS.OK).json({
        auction: await toPublicAuction(auction, userRepository),
        serverTime: new Date().toISOString(),
      });
    }),
  );

  router.get(
    '/:id/bids',
    optionalAuth,
    asyncHandler(async (req, res) => {
      const auctionId = req.params['id'] as string;
      await auctionService.getAuctionForViewer(getViewerId(res), auctionId);
      const bids = await requireBidService(bidService).listBids(auctionId);
      res.status(HTTP_STATUS.OK).json({ bids });
    }),
  );

  router.post(
    '/:id/bids',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const auctionId = req.params['id'] as string;
      const amountCOP = pickStringFields<{ amountCOP: string }>(req.body, ['amountCOP']).amountCOP;
      const { auction, bid } = await requireBidService(bidService).placeBid(
        userId,
        auctionId,
        amountCOP,
      );
      res
        .status(HTTP_STATUS.CREATED)
        .json({ auction: await toPublicAuction(auction, userRepository), bid });
    }),
  );

  router.patch(
    '/:id',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const patch = pickPresentStringFields<UpdateAuctionInput>(req.body, UPDATE_FIELDS);
      const auction = await auctionService.updateAuction(userId, req.params['id'] as string, patch);
      res.status(HTTP_STATUS.OK).json({ auction: await toPublicAuction(auction, userRepository) });
    }),
  );

  router.delete(
    '/:id',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      await auctionService.deleteAuction(userId, req.params['id'] as string);
      res.status(HTTP_STATUS.NO_CONTENT).end();
    }),
  );

  router.post(
    '/:id/photos',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      try {
        await runUpload(req, res);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid upload';
        throw new HttpError(message, HTTP_STATUS.BAD_REQUEST);
      }

      const userId = res.locals['userId'] as string;
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const auction = await auctionService.addPhotos(
        userId,
        req.params['id'] as string,
        files.map((file) => ({ originalName: file.originalname, buffer: file.buffer })),
      );
      res.status(HTTP_STATUS.OK).json({ auction: await toPublicAuction(auction, userRepository) });
    }),
  );

  return router;
}
