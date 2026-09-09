# 007 — Plan

## Approach

Two independent read paths sharing one new backend capability. Both go through
`bid.service.ts`, which already holds `auctionRepository` (injected in `container.ts` alongside
`bidRepository`), so the join between "bids I placed" and "the auction's current state" belongs
there rather than in a route handler.

## Key decisions

- **One row per auction, not per bid.** A bidder may have placed several bids on the same auction
  as the price climbed; "My bids" collapses those to the user's own highest bid on that auction,
  matching how a bidder actually thinks about it ("where do I stand on this item"), not a raw
  event log (which `BidHistory` on the detail page already covers, per-auction).
- **Status is derived, not stored.** `isWinning = myBidCOP === auction.currentBidCOP` computed at
  read time from data that already exists (`Bid.amountCOP`, `Auction.currentBidCOP`,
  `Auction.status`) — no new persisted field, no risk of it drifting out of sync with a real bid.
  The frontend derives the human label (Winning/Outbid/Won/Lost/Ended) from `isWinning` +
  `auction.status` + `formatTimeLeft`, the same way `AuctionCard` already derives its own labels.
- **In-grid indicator reuses the same data**, fetched once per Auctions-page load via the new
  `GET /api/auctions/my-bids`, turned into a `Map<auctionId, myBidCOP>` client-side. No change to
  `GET /api/auctions` itself or its response shape — keeps that endpoint anonymous-cacheable and
  avoids a per-viewer field on `PublicAuction`.
- **Icon.** `IconName` is a closed union (`apps/web/src/components/atoms/icon.tsx`); add `'gavel'`
  for the new nav item, following the exact pattern used for `chevron-down` in the QA-fixes round
  (add to the union, add a path, no test enumerates every icon).

## Data flow

```
apps/api/src/repositories/bid.repository.ts       findByUserId(userId): Promise<Bid[]>
apps/api/src/repositories/bid.repository.json.ts  filter by userId, sort newest first
apps/api/src/services/bid.service.ts              listMyBids(userId): Promise<PublicMyBid[]>
  -> group bids by auctionId, take max(amountCOP) per group
  -> auctionRepository.findById per distinct auctionId
  -> isWinning = myBidCOP === auction.currentBidCOP && auction.status === 'published'
apps/api/src/routes/auction.routes.ts             GET /my-bids (requireAuth), before /:id
apps/web/src/lib/api-client.ts                    fetchMyBids(): Promise<PublicMyBid[]>
apps/web/src/pages/my-bids-page.tsx                new page, mirrors purchases-page.tsx's shape
apps/web/src/pages/auctions-page.tsx               fetch fetchMyBids() when signed in -> Map
apps/web/src/components/organisms/auction-grid.tsx  Map<string, number> myBidsByAuctionId prop
apps/web/src/components/molecules/auction-card.tsx  optional myBidCOP prop -> "You bid $X" line
```

## Non-goals carried from spec.md

No polling on My bids, no pagination, no change to `placeBid`, no merge with Purchases.
