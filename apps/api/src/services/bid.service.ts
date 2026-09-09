import { BID_WINDOW_MS, isValidNextBid, minimumNextBid, type PublicBid } from '@thrift-loop/shared';
import type { Auction } from '../models/auction.js';
import type { Bid } from '../models/bid.js';
import type { AuctionRepository } from '../repositories/auction.repository.js';
import type { BidRepository } from '../repositories/bid.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { KeyedMutex } from '../lib/keyed-mutex.js';
import { createPrefixedId } from '../lib/prefixed-id.js';
import { HttpError } from '../lib/http-error.js';
import { HTTP_STATUS } from '../lib/http-status.js';

const BID_ID_PREFIX = 'BID';
const AUCTION_NOT_FOUND_MESSAGE = 'Auction not found';
const NOT_OPEN_FOR_BIDDING_MESSAGE = 'This auction is not open for bidding';
const BIDDING_CLOSED_MESSAGE = 'Bidding has closed';
const OWN_AUCTION_MESSAGE = 'You cannot bid on your own auction';
const UNKNOWN_BIDDER_NAME = 'A bidder';

function parseAmount(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) {
    return null;
  }
  return Number(raw);
}

function validateBid(auction: Auction, userId: string, amount: number | null, now: Date): void {
  if (auction.status !== 'published') {
    throw new HttpError(NOT_OPEN_FOR_BIDDING_MESSAGE, HTTP_STATUS.CONFLICT);
  }
  if (auction.userId === userId) {
    throw new HttpError(OWN_AUCTION_MESSAGE, HTTP_STATUS.FORBIDDEN);
  }
  if (auction.bidEndsAt !== null && new Date(auction.bidEndsAt).getTime() <= now.getTime()) {
    throw new HttpError(BIDDING_CLOSED_MESSAGE, HTTP_STATUS.CONFLICT);
  }
  if (amount === null || !isValidNextBid(amount, auction.currentBidCOP, auction.priceCOP)) {
    const minimum = minimumNextBid(auction.currentBidCOP, auction.priceCOP);
    throw new HttpError('Validation failed', HTTP_STATUS.BAD_REQUEST, {
      amountCOP: `Enter a whole number of at least ${minimum} COP`,
    });
  }
}

export function createBidService(
  auctionRepository: AuctionRepository,
  bidRepository: BidRepository,
  userRepository: UserRepository,
  mutex: KeyedMutex,
) {
  return {
    async placeBid(
      userId: string,
      auctionId: string,
      amountRaw: string,
    ): Promise<{ auction: Auction; bid: Bid }> {
      return mutex.runExclusive(auctionId, async () => {
        const auction = await auctionRepository.findById(auctionId);
        if (!auction) {
          throw new HttpError(AUCTION_NOT_FOUND_MESSAGE, HTTP_STATUS.NOT_FOUND);
        }

        const now = new Date();
        const amount = parseAmount(amountRaw);
        validateBid(auction, userId, amount, now);

        const bid: Bid = {
          id: createPrefixedId(BID_ID_PREFIX),
          auctionId,
          userId,
          amountCOP: amount as number,
          createdAt: now.toISOString(),
        };
        await bidRepository.save(bid);

        const updated = await auctionRepository.update(auctionId, {
          currentBidCOP: bid.amountCOP,
          bidCount: auction.bidCount + 1,
          bidEndsAt: new Date(now.getTime() + BID_WINDOW_MS).toISOString(),
        });

        return { auction: updated as Auction, bid };
      });
    },

    async listMyBids(
      userId: string,
    ): Promise<{ auction: Auction; myBidCOP: number; isWinning: boolean }[]> {
      const myBids = await bidRepository.findByUserId(userId);

      // A user's own bids on one auction only ever increase (validateBid requires
      // beating the current bid), so the highest amount is their "real" bid on it —
      // safer than trusting bid order, which can tie on createdAt.
      const bestBidByAuction = new Map<string, Bid>();
      for (const bid of myBids) {
        const existing = bestBidByAuction.get(bid.auctionId);
        if (!existing || bid.amountCOP > existing.amountCOP) {
          bestBidByAuction.set(bid.auctionId, bid);
        }
      }

      const bestBids = [...bestBidByAuction.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );

      const entries: { auction: Auction; myBidCOP: number; isWinning: boolean }[] = [];
      for (const bid of bestBids) {
        const auction = await auctionRepository.findById(bid.auctionId);
        if (!auction) {
          continue;
        }
        entries.push({
          auction,
          myBidCOP: bid.amountCOP,
          isWinning: auction.status === 'published' && auction.currentBidCOP === bid.amountCOP,
        });
      }

      return entries;
    },

    async listBids(auctionId: string): Promise<PublicBid[]> {
      const bids = await bidRepository.findByAuctionId(auctionId);
      return Promise.all(
        bids.map(async (bid) => {
          const bidder = await userRepository.findById(bid.userId);
          return {
            id: bid.id,
            auctionId: bid.auctionId,
            bidderId: bid.userId,
            bidderFirstName: bidder?.firstName ?? UNKNOWN_BIDDER_NAME,
            amountCOP: bid.amountCOP,
            createdAt: bid.createdAt,
          };
        }),
      );
    },
  };
}

export type BidService = ReturnType<typeof createBidService>;
