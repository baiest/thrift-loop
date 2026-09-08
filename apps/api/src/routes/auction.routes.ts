import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  isAllowedPhotoMimeType,
  MAX_PHOTOS_PER_AUCTION,
  MAX_PHOTO_SIZE_BYTES,
  type PublicAuction,
} from '@thrift-loop/shared';
import { HTTP_STATUS } from '../lib/http-status.js';
import { HttpError } from '../lib/http-error.js';
import { asyncHandler } from '../lib/async-handler.js';
import { pickPresentStringFields, pickStringFields } from '../lib/request-body.js';
import { requireAuth } from '../middlewares/require-auth.js';
import type { Auction } from '../models/auction.js';
import type {
  AuctionService,
  CreateAuctionInput,
  UpdateAuctionInput,
} from '../services/auction.service.js';

const CREATE_FIELDS = [
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

const INVALID_FILE_TYPE_MESSAGE = `Only ${ALLOWED_PHOTO_MIME_TYPES.join(', ')} files are allowed`;

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

function toPublicAuction(auction: Auction): PublicAuction {
  return {
    id: auction.id,
    userId: auction.userId,
    category: auction.category,
    condition: auction.condition,
    priceCOP: auction.priceCOP,
    publishAt: auction.publishAt,
    status: auction.status,
    deliveryMethod: auction.deliveryMethod,
    photoUrls: auction.photoKeys.map((key) => `/uploads/${key}`),
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

export function createAuctionRouter(auctionService: AuctionService): Router {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const input = pickStringFields<CreateAuctionInput>(req.body, CREATE_FIELDS);
      const auction = await auctionService.createAuction(userId, input);
      res.status(HTTP_STATUS.CREATED).json({ auction: toPublicAuction(auction) });
    }),
  );

  router.get(
    '/mine',
    requireAuth,
    asyncHandler(async (_req, res) => {
      const userId = res.locals['userId'] as string;
      const auctions = await auctionService.listMyAuctions(userId);
      res.status(HTTP_STATUS.OK).json({ auctions: auctions.map(toPublicAuction) });
    }),
  );

  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const auction = await auctionService.getAuction(userId, req.params['id'] as string);
      res.status(HTTP_STATUS.OK).json({ auction: toPublicAuction(auction) });
    }),
  );

  router.patch(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const patch = pickPresentStringFields<UpdateAuctionInput>(req.body, UPDATE_FIELDS);
      const auction = await auctionService.updateAuction(userId, req.params['id'] as string, patch);
      res.status(HTTP_STATUS.OK).json({ auction: toPublicAuction(auction) });
    }),
  );

  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      await auctionService.deleteAuction(userId, req.params['id'] as string);
      res.status(HTTP_STATUS.NO_CONTENT).end();
    }),
  );

  router.post(
    '/:id/photos',
    requireAuth,
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
      res.status(HTTP_STATUS.OK).json({ auction: toPublicAuction(auction) });
    }),
  );

  return router;
}
