import {
  isDeliveryMethod,
  isItemCategory,
  isItemCondition,
  isValidCopPrice,
  MAX_PHOTOS_PER_AUCTION,
} from '@thrift-loop/shared';
import type { Auction } from '../models/auction.js';
import type { AuctionPatch, AuctionRepository } from '../repositories/auction.repository.js';
import type { PhotoStorage, UploadedFile } from '../lib/photo-storage.js';
import { createPrefixedId } from '../lib/prefixed-id.js';
import { HttpError } from '../lib/http-error.js';
import { HTTP_STATUS } from '../lib/http-status.js';

const AUCTION_ID_PREFIX = 'AUC';
const AUCTION_NOT_FOUND_MESSAGE = 'Auction not found';
const CANNOT_EDIT_PUBLISHED_MESSAGE = 'Cannot edit a published auction';
const TOO_MANY_PHOTOS_MESSAGE = `An auction can have at most ${MAX_PHOTOS_PER_AUCTION} photos`;

export interface CreateAuctionInput {
  category: string;
  condition: string;
  deliveryMethod: string;
  priceCOP: string;
  publishAt: string;
}

export type UpdateAuctionInput = Partial<CreateAuctionInput> & { status?: string };

function validatePrice(value: string, errors: Record<string, string>): number | undefined {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !isValidCopPrice(parsed)) {
    errors['priceCOP'] = 'Enter a whole number price in Colombian pesos';
    return undefined;
  }
  return parsed;
}

function validatePublishAt(value: string, errors: Record<string, string>): string | null {
  if (value.length === 0) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    errors['publishAt'] = 'Enter a valid date';
    return null;
  }
  if (parsed.getTime() <= Date.now()) {
    errors['publishAt'] = 'The publish date must be in the future';
    return null;
  }
  return parsed.toISOString();
}

function validateCreateInput(input: CreateAuctionInput): {
  errors: Record<string, string>;
  priceCOP: number | undefined;
  publishAt: string | null;
} {
  const errors: Record<string, string> = {};

  if (!isItemCategory(input.category)) {
    errors['category'] = 'Select a valid category';
  }
  if (!isItemCondition(input.condition)) {
    errors['condition'] = 'Select a valid condition';
  }
  if (!isDeliveryMethod(input.deliveryMethod)) {
    errors['deliveryMethod'] = 'Select a valid delivery method';
  }
  const priceCOP = validatePrice(input.priceCOP, errors);
  const publishAt = validatePublishAt(input.publishAt, errors);

  return { errors, priceCOP, publishAt };
}

function applyCategoryPatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (isItemCategory(value)) {
    repoPatch.category = value;
  } else {
    errors['category'] = 'Select a valid category';
  }
}

function applyConditionPatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (isItemCondition(value)) {
    repoPatch.condition = value;
  } else {
    errors['condition'] = 'Select a valid condition';
  }
}

function applyDeliveryMethodPatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (isDeliveryMethod(value)) {
    repoPatch.deliveryMethod = value;
  } else {
    errors['deliveryMethod'] = 'Select a valid delivery method';
  }
}

function applyStatusPatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (value === 'draft' || value === 'published') {
    repoPatch.status = value;
  } else {
    errors['status'] = 'Status must be draft or published';
  }
}

function validateUpdatePatch(patch: UpdateAuctionInput): {
  errors: Record<string, string>;
  repoPatch: AuctionPatch;
} {
  const errors: Record<string, string> = {};
  const repoPatch: AuctionPatch = {};

  if (patch.category !== undefined) {
    applyCategoryPatch(patch.category, repoPatch, errors);
  }
  if (patch.condition !== undefined) {
    applyConditionPatch(patch.condition, repoPatch, errors);
  }
  if (patch.deliveryMethod !== undefined) {
    applyDeliveryMethodPatch(patch.deliveryMethod, repoPatch, errors);
  }
  if (patch.priceCOP !== undefined) {
    const priceCOP = validatePrice(patch.priceCOP, errors);
    if (priceCOP !== undefined) {
      repoPatch.priceCOP = priceCOP;
    }
  }
  if (patch.publishAt !== undefined) {
    repoPatch.publishAt = validatePublishAt(patch.publishAt, errors);
  }
  if (patch.status !== undefined) {
    applyStatusPatch(patch.status, repoPatch, errors);
  }

  return { errors, repoPatch };
}

export function createAuctionService(
  auctionRepository: AuctionRepository,
  photoStorage: PhotoStorage,
) {
  async function getOwnedAuction(userId: string, auctionId: string): Promise<Auction> {
    const auction = await auctionRepository.findById(auctionId);
    if (!auction || auction.userId !== userId) {
      throw new HttpError(AUCTION_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
    }
    return auction;
  }

  return {
    async createAuction(userId: string, input: CreateAuctionInput): Promise<Auction> {
      const { errors, priceCOP, publishAt } = validateCreateInput(input);
      if (Object.keys(errors).length > 0) {
        throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors);
      }

      const now = new Date().toISOString();
      const auction: Auction = {
        id: createPrefixedId(AUCTION_ID_PREFIX),
        userId,
        category: input.category as Auction['category'],
        condition: input.condition as Auction['condition'],
        deliveryMethod: input.deliveryMethod as Auction['deliveryMethod'],
        priceCOP: priceCOP as number,
        publishAt,
        status: 'draft',
        photoKeys: [],
        currentBidCOP: null,
        bidCount: 0,
        bidEndsAt: null,
        winnerUserId: null,
        createdAt: now,
        updatedAt: now,
      };
      await auctionRepository.save(auction);
      return auction;
    },

    async updateAuction(
      userId: string,
      auctionId: string,
      patch: UpdateAuctionInput,
    ): Promise<Auction> {
      const auction = await getOwnedAuction(userId, auctionId);
      // Bidding only ever happens on a 'published' auction, so 'draft' is already
      // bid-free by construction — this guard alone also satisfies "no edits once
      // an auction has a bid" without a separate bidCount check.
      if (auction.status !== 'draft') {
        throw new HttpError(CANNOT_EDIT_PUBLISHED_MESSAGE, HTTP_STATUS.CONFLICT);
      }

      const { errors, repoPatch } = validateUpdatePatch(patch);
      if (Object.keys(errors).length > 0) {
        throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, errors);
      }

      const updated = await auctionRepository.update(auctionId, repoPatch);
      return updated as Auction;
    },

    async deleteAuction(userId: string, auctionId: string): Promise<void> {
      await getOwnedAuction(userId, auctionId);
      await photoStorage.deletePhotosForAuction(userId, auctionId);
      await auctionRepository.delete(auctionId);
    },

    async listMyAuctions(userId: string): Promise<Auction[]> {
      return auctionRepository.findByUserId(userId);
    },

    async getAuction(userId: string, auctionId: string): Promise<Auction> {
      return getOwnedAuction(userId, auctionId);
    },

    async addPhotos(userId: string, auctionId: string, files: UploadedFile[]): Promise<Auction> {
      const auction = await getOwnedAuction(userId, auctionId);
      if (auction.status !== 'draft') {
        throw new HttpError(CANNOT_EDIT_PUBLISHED_MESSAGE, HTTP_STATUS.CONFLICT);
      }
      if (auction.photoKeys.length + files.length > MAX_PHOTOS_PER_AUCTION) {
        throw new HttpError(TOO_MANY_PHOTOS_MESSAGE, HTTP_STATUS.CONFLICT);
      }

      const keys = await photoStorage.savePhotos(userId, auctionId, files);
      const updated = await auctionRepository.addPhotoKeys(auctionId, keys);
      return updated as Auction;
    },

    async listPublishedAuctions(): Promise<Auction[]> {
      return auctionRepository.findAllPublished();
    },

    async getAuctionForViewer(viewerId: string | null, auctionId: string): Promise<Auction> {
      const auction = await auctionRepository.findById(auctionId);
      const isVisible = auction && (auction.status !== 'draft' || auction.userId === viewerId);
      if (!isVisible) {
        throw new HttpError(AUCTION_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
      }
      return auction;
    },

    async listMyPurchases(userId: string): Promise<Auction[]> {
      return auctionRepository.findWonByUserId(userId);
    },
  };
}

export type AuctionService = ReturnType<typeof createAuctionService>;
