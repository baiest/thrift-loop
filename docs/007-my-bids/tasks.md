# 007 — Tasks

## Phase 0 — Shared type

- [x] `packages/shared/src/bid.ts`: add `PublicMyBid` interface + export from `index.ts`

## Phase 1 — Backend: findByUserId and listMyBids

- [x] `apps/api/src/repositories/bid.repository.ts`: add `findByUserId` to the interface
- [x] `apps/api/src/repositories/bid.repository.json.test.ts` + `.json.ts`: implement
      `findByUserId` (filter by userId, newest first) — test first
- [x] `apps/api/src/services/bid.service.test.ts` + `bid.service.ts`: `listMyBids(userId)` —
      groups bids by auction (max amountCOP per auction), joins the auction, computes `isWinning`;
      cases: no bids, one auction with multiple bids (keeps the highest), winning vs outbid,
      auction sold to someone else, auction the user's own bid won
- [x] `apps/api/src/routes/auction.routes.test.ts` + `auction.routes.ts`: `GET /my-bids`
      (`requireAuth`), mounted before `/:id`

## Phase 2 — Frontend: My bids page

- [x] `apps/web/src/lib/api-client.test.ts` + `api-client.ts`: `fetchMyBids()`
- [x] `apps/web/src/components/atoms/icon.test.tsx` + `icon.tsx`: add `'gavel'` to `IconName`
- [x] `apps/web/src/pages/my-bids-page.test.tsx` + `my-bids-page.tsx`: list rows (title, current
      price, own bid, status pill, time left), redirect-to-login when signed out, empty state
- [x] `apps/web/src/app.tsx` (or router config): `/my-bids` route
- [x] `apps/web/src/components/organisms/sidebar-nav.test.tsx` + `sidebar-nav.tsx`: "My bids" item
      in `NAV_ITEMS` (desktop + tablet only, matching how "My purchases" is already handled)

## Phase 3 — Frontend: in-grid indicator

- [x] `apps/web/src/components/molecules/auction-card.test.tsx` + `auction-card.tsx`: optional
      `myBidCOP` prop renders "You bid $X"; absent when not provided
- [x] `apps/web/src/components/organisms/auction-grid.test.tsx` + `auction-grid.tsx`:
      `myBidsByAuctionId` prop threaded to each card
- [x] `apps/web/src/pages/auctions-page.test.tsx` + `auctions-page.tsx`: fetch `fetchMyBids()`
      alongside the current user (signed-in only), build the lookup map, pass to `AuctionGrid`

## Wrap-up

- [x] `npm run verify` green
- [x] Manual: bid on an auction as one seed user, confirm it shows on Auctions grid and on
      My bids for that user, with the right status after being outbid by another seed user
- [x] Open PR, confirm CI is green, leave merge to the user
