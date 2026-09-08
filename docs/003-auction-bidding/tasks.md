# 003 — Tasks

## packages/shared

- [ ] `bid.ts` (`MIN_BID_INCREMENT_COP`, `BID_WINDOW_MS`, `minimumNextBid`, `isValidNextBid`) + test
- [ ] `auction.ts`: `AuctionStatus` gains `'sold'`; `PublicAuction` gains bid/winner fields
- [ ] `user.ts`: `PublicUser` gains `address`
- [ ] `index.ts` barrel updated

## apps/api — infra

- [ ] `lib/keyed-mutex.ts` + test
- [ ] `lib/json-file-store.ts` (atomic temp+rename write) + test; refactor
      `auction.repository.json.ts` and `user.repository.json.ts` onto it, existing tests stay green
- [ ] `create-app.ts`: options-object refactor (own commit, behaviour-preserving) + update all
      existing tests/call sites

## apps/api — bid domain

- [ ] `models/bid.ts`; extend `models/auction.ts`, `models/user.ts`
- [ ] `repositories/bid.repository.ts` (interface) + `.json.ts` impl + test
- [ ] Extend `auction.repository.ts`/`.json.ts`: widened `AuctionPatch`, `findAllPublished`,
      `findDueForClose`, `findWonByUserId`, legacy-row normalization + tests
- [ ] Extend `user.repository.ts`/`.json.ts`: `update` + test
- [ ] `services/bid.service.ts` (`placeBid`, `listBids`) + test, incl. the concurrent-bid test
- [ ] Extend `auction.service.ts`: bid-locked edit guard, `listPublishedAuctions`,
      `getAuctionForViewer`, `listMyPurchases` + tests
- [ ] Extend `auth.service.ts`: `updateProfile`, `toPublicUser` emits `address` + tests
- [ ] Extend `lib/publish-scheduler.ts`: `closeDueAuctions` + `startAuctionScheduler` + test
- [ ] Extend `routes/auction.routes.ts`: `GET /`, `GET /:id` (public), `GET /:id/bids`,
      `POST /:id/bids`, `GET /purchases` + supertest tests (watch route ordering)
- [ ] Extend `routes/auth.routes.ts`: `PATCH /me` + test
- [ ] `container.ts`: wire `bidRepository`, `bidService`, one shared mutex instance
- [ ] `index.ts`: `startAuctionScheduler(...)` replacing the publish-only call

## apps/web

- [ ] `lib/format.ts` (`formatCOP`, `formatRemaining`) + test
- [ ] `lib/api-client.ts`: `fetchPublishedAuctions`, `fetchAuctionDetail`, `fetchBids`,
      `placeBid`, `fetchMyPurchases`, `updateProfile` + tests
- [ ] `components/atoms/badge.tsx` + test
- [ ] `components/molecules/countdown.tsx` + test (fake timers)
- [ ] `components/molecules/auction-card.tsx` + test (incl. no-photo case)
- [ ] `components/molecules/bid-history.tsx` + test
- [ ] `components/organisms/bid-form.tsx` + test
- [ ] `components/organisms/auction-grid.tsx` + test
- [ ] `pages/auctions-page.tsx` + test
- [ ] `pages/auction-detail-page.tsx` + test (polling via fake timers)
- [ ] `pages/purchases-page.tsx` + test
- [ ] `pages/profile-page.tsx` + test
- [ ] `components/organisms/sidebar-nav.tsx`: new nav items + test update
- [ ] `app.tsx`: new routes + test update

## Wrap-up

- [ ] `npm run verify` green (typecheck, lint, format, coverage >85.01%, build)
- [ ] Manual smoke test per `plan.md`'s test strategy, incl. the two-parallel-bid check
- [ ] Open PR, confirm all CI checks pass, leave merge to the user
