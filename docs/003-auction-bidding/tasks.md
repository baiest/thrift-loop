# 003 — Tasks

## packages/shared

- [x] `bid.ts` (`MIN_BID_INCREMENT_COP`, `BID_WINDOW_MS`, `minimumNextBid`, `isValidNextBid`) + test
- [x] `auction.ts`: `AuctionStatus` gains `'sold'`; `PublicAuction` gains bid/winner fields
- [x] `user.ts`: `PublicUser` gains `address`
- [x] `index.ts` barrel updated

## apps/api — infra

- [x] `lib/keyed-mutex.ts` + test
- [x] `lib/json-file-store.ts` (atomic temp+rename write) + test; refactor
      `auction.repository.json.ts` and `user.repository.json.ts` onto it, existing tests stay green
- [x] `create-app.ts`: options-object refactor (own commit, behaviour-preserving) + update all
      existing tests/call sites

## apps/api — bid domain

- [x] `models/bid.ts`; extend `models/auction.ts`, `models/user.ts`
- [x] `repositories/bid.repository.ts` (interface) + `.json.ts` impl + test
- [x] Extend `auction.repository.ts`/`.json.ts`: widened `AuctionPatch`, `findAllPublished`,
      `findDueForClose`, `findWonByUserId`, legacy-row normalization + tests
- [x] Extend `user.repository.ts`/`.json.ts`: `update` + test
- [x] `services/bid.service.ts` (`placeBid`, `listBids`) + test, incl. the concurrent-bid test
- [x] Extend `auction.service.ts`: bid-locked edit guard, `listPublishedAuctions`,
      `getAuctionForViewer`, `listMyPurchases` + tests
- [x] Extend `auth.service.ts`: `updateProfile`, `toPublicUser` emits `address` + tests
- [x] Extend `lib/publish-scheduler.ts`: `closeDueAuctions` + `startAuctionScheduler` + test
- [x] Extend `routes/auction.routes.ts`: `GET /`, `GET /:id` (public), `GET /:id/bids`,
      `POST /:id/bids`, `GET /purchases` + supertest tests (watch route ordering)
- [x] Extend `routes/auth.routes.ts`: `PATCH /me` + test
- [x] `container.ts`: wire `bidRepository`, `bidService`, one shared mutex instance
- [x] `index.ts`: `startAuctionScheduler(...)` replacing the publish-only call

## apps/web

- [x] `lib/format.ts` (`formatCOP`, `formatRemaining`) + test
- [x] `lib/api-client.ts`: `fetchPublishedAuctions`, `fetchAuctionDetail`, `fetchBids`,
      `placeBid`, `fetchMyPurchases`, `updateProfile` + tests
- [x] `components/atoms/badge.tsx` + test
- [x] `components/molecules/countdown.tsx` + test (fake timers)
- [x] `components/molecules/auction-card.tsx` + test (incl. no-photo case)
- [x] `components/molecules/bid-history.tsx` + test
- [x] `components/organisms/bid-form.tsx` + test
- [x] `components/organisms/auction-grid.tsx` + test
- [x] `pages/auctions-page.tsx` + test
- [x] `pages/auction-detail-page.tsx` + test (polling via fake timers)
- [x] `pages/purchases-page.tsx` + test
- [x] `pages/profile-page.tsx` + test
- [x] `components/organisms/sidebar-nav.tsx`: new nav items + test update
- [x] `app.tsx`: new routes + test update

## Wrap-up

- [x] `npm run verify` green (typecheck, lint, format, coverage >85.01%, build)
- [x] Manual smoke test per `plan.md`'s test strategy, incl. the two-parallel-bid check
- [ ] Open PR, confirm all CI checks pass, leave merge to the user
