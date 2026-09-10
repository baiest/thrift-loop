import {
  DEFAULT_AUCTION_SORT,
  isAuctionSort,
  isColombiaCity,
  isDeliveryMethod,
  isItemCategory,
  isItemCondition,
  isValidCopPrice,
  isValidDescription,
  isValidTitle,
  MAX_DESCRIPTION_LENGTH,
  MAX_PHOTOS_PER_AUCTION,
  MAX_PRICE_COP,
  MAX_TITLE_LENGTH,
  MIN_PRICE_COP,
  TITLE_PATTERN,
  type AuctionSort,
} from '@thrift-loop/shared';
import type { Auction } from '../models/auction.js';
import type {
  AuctionFilter,
  AuctionPatch,
  AuctionRepository,
} from '../repositories/auction.repository.js';
import type { PhotoStorage, UploadedFile } from '../lib/photo-storage.js';
import { createPrefixedId } from '../lib/prefixed-id.js';
import { HttpError } from '../lib/http-error.js';
import { HTTP_STATUS } from '../lib/http-status.js';
import { NOOP_LOGGER, type Logger } from '../lib/logger.js';

const AUCTION_ID_PREFIX = 'AUC';
const AUCTION_NOT_FOUND_MESSAGE = 'Auction not found';
const CANNOT_EDIT_PUBLISHED_MESSAGE = 'Cannot edit a published auction';
const TOO_MANY_PHOTOS_MESSAGE = `An auction can have at most ${MAX_PHOTOS_PER_AUCTION} photos`;
const TITLE_ERROR_MESSAGE = 'Enter a title up to 80 characters, letters and numbers only';
const DESCRIPTION_ERROR_MESSAGE = `Enter a description up to ${MAX_DESCRIPTION_LENGTH} characters, letters and numbers only`;
const LOCATION_ERROR_MESSAGE = 'Select a valid city';

export interface CreateAuctionInput {
  title: string;
  description: string;
  category: string;
  condition: string;
  deliveryMethod: string;
  priceCOP: string;
  publishAt: string;
  location: string;
}

export interface AuctionSearchInput {
  search?: string;
  category?: string;
  city?: string;
  minPriceCOP?: string;
  maxPriceCOP?: string;
  sort?: string;
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

  if (!isValidTitle(input.title)) {
    errors['title'] = TITLE_ERROR_MESSAGE;
  }
  if (!isValidDescription(input.description)) {
    errors['description'] = DESCRIPTION_ERROR_MESSAGE;
  }
  if (!isColombiaCity(input.location)) {
    errors['location'] = LOCATION_ERROR_MESSAGE;
  }
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

function applyTitlePatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (isValidTitle(value)) {
    repoPatch.title = value;
  } else {
    errors['title'] = TITLE_ERROR_MESSAGE;
  }
}

function applyDescriptionPatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (isValidDescription(value)) {
    repoPatch.description = value;
  } else {
    errors['description'] = DESCRIPTION_ERROR_MESSAGE;
  }
}

function applyLocationPatch(
  value: string,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (isColombiaCity(value)) {
    repoPatch.location = value;
  } else {
    errors['location'] = LOCATION_ERROR_MESSAGE;
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

function applyTextPatches(
  patch: UpdateAuctionInput,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (patch.title !== undefined) {
    applyTitlePatch(patch.title, repoPatch, errors);
  }
  if (patch.description !== undefined) {
    applyDescriptionPatch(patch.description, repoPatch, errors);
  }
  if (patch.location !== undefined) {
    applyLocationPatch(patch.location, repoPatch, errors);
  }
}

function applyEnumPatches(
  patch: UpdateAuctionInput,
  repoPatch: AuctionPatch,
  errors: Record<string, string>,
): void {
  if (patch.category !== undefined) {
    applyCategoryPatch(patch.category, repoPatch, errors);
  }
  if (patch.condition !== undefined) {
    applyConditionPatch(patch.condition, repoPatch, errors);
  }
  if (patch.deliveryMethod !== undefined) {
    applyDeliveryMethodPatch(patch.deliveryMethod, repoPatch, errors);
  }
  if (patch.status !== undefined) {
    applyStatusPatch(patch.status, repoPatch, errors);
  }
}

function validateUpdatePatch(patch: UpdateAuctionInput): {
  errors: Record<string, string>;
  repoPatch: AuctionPatch;
} {
  const errors: Record<string, string> = {};
  const repoPatch: AuctionPatch = {};

  applyTextPatches(patch, repoPatch, errors);
  applyEnumPatches(patch, repoPatch, errors);
  if (patch.priceCOP !== undefined) {
    const priceCOP = validatePrice(patch.priceCOP, errors);
    if (priceCOP !== undefined) {
      repoPatch.priceCOP = priceCOP;
    }
  }
  if (patch.publishAt !== undefined) {
    repoPatch.publishAt = validatePublishAt(patch.publishAt, errors);
  }

  return { errors, repoPatch };
}

/**
 * Sanitizes (never rejects) a free-text search term: trims, strips anything
 * outside the title whitelist, and truncates to the same max length titles
 * allow. A browse endpoint degrades gracefully instead of 400ing on a stray
 * character.
 */
function sanitizeSearch(value: string): string {
  const stripped = [...value].filter((char) => TITLE_PATTERN.test(char)).join('');
  return stripped.trim().slice(0, MAX_TITLE_LENGTH);
}

function parseFilterPrice(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= MIN_PRICE_COP && parsed <= MAX_PRICE_COP
    ? parsed
    : undefined;
}

function resolvePriceRange(input: AuctionSearchInput): {
  minPriceCOP: number | undefined;
  maxPriceCOP: number | undefined;
} {
  const minPriceCOP = parseFilterPrice(input.minPriceCOP);
  const maxPriceCOP = parseFilterPrice(input.maxPriceCOP);
  const isInverted =
    minPriceCOP !== undefined && maxPriceCOP !== undefined && minPriceCOP > maxPriceCOP;
  return isInverted
    ? { minPriceCOP: undefined, maxPriceCOP: undefined }
    : { minPriceCOP, maxPriceCOP };
}

function resolveCategoryFilter(input: AuctionSearchInput): Auction['category'] | undefined {
  return input.category && isItemCategory(input.category) ? input.category : undefined;
}

function resolveLocationFilter(input: AuctionSearchInput): string | undefined {
  return input.city && isColombiaCity(input.city) ? input.city : undefined;
}

function resolveSortFilter(input: AuctionSearchInput): AuctionSort {
  return input.sort && isAuctionSort(input.sort) ? input.sort : DEFAULT_AUCTION_SORT;
}

function buildAuctionFilter(input: AuctionSearchInput): AuctionFilter {
  const search = input.search ? sanitizeSearch(input.search) : undefined;
  const category = resolveCategoryFilter(input);
  const location = resolveLocationFilter(input);
  const { minPriceCOP, maxPriceCOP } = resolvePriceRange(input);
  const sort = resolveSortFilter(input);
  return {
    ...(search && { search }),
    ...(category && { category }),
    ...(location && { location }),
    ...(minPriceCOP !== undefined && { minPriceCOP }),
    ...(maxPriceCOP !== undefined && { maxPriceCOP }),
    sort,
  };
}

export function createAuctionService(
  auctionRepository: AuctionRepository,
  photoStorage: PhotoStorage,
  logger: Logger = NOOP_LOGGER,
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
        title: input.title.trim(),
        description: input.description.trim(),
        location: input.location,
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
      logger.info('auction_created', { auctionId: auction.id, userId });
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
      logger.info('auction_updated', { auctionId, userId });
      return updated as Auction;
    },

    async deleteAuction(userId: string, auctionId: string): Promise<void> {
      await getOwnedAuction(userId, auctionId);
      await photoStorage.deletePhotosForAuction(userId, auctionId);
      await auctionRepository.delete(auctionId);
      logger.info('auction_deleted', { auctionId, userId });
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

      let keys: string[];
      try {
        keys = await photoStorage.savePhotos(userId, auctionId, files);
      } catch (caught) {
        logger.error('photo_upload_failed', {
          auctionId,
          userId,
          message: caught instanceof Error ? caught.message : String(caught),
        });
        throw caught;
      }
      const updated = await auctionRepository.addPhotoKeys(auctionId, keys);
      logger.info('photos_uploaded', { auctionId, userId, count: files.length });
      return updated as Auction;
    },

    async listPublishedAuctions(input: AuctionSearchInput = {}): Promise<Auction[]> {
      return auctionRepository.findAllPublished(buildAuctionFilter(input));
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
