# 018 — Tasks: Max bid increment

## Shared domain

- [x] Write failing test: `isValidMaxBidIncrement` rejects a cap below `MIN_BID_INCREMENT_COP`,
      rejects non-integer, rejects above `MAX_PRICE_COP`, accepts a valid cap.
- [x] Write failing test: `maximumNextBid` returns `priceCOP + cap` when `currentBidCOP` is
      null, `currentBidCOP + cap` otherwise, clamped to `MAX_PRICE_COP`.
- [x] Write failing test: `isValidNextBid` (4-arg) accepts an amount exactly at the ceiling,
      rejects one COP over, still rejects below the minimum.
- [x] Implement `isValidMaxBidIncrement`, `maximumNextBid`, and the 4th parameter on
      `isValidNextBid` in `packages/shared/src/bid.ts`.
- [x] Update existing `isValidNextBid` call sites/tests in `bid.test.ts` with the new required
      argument.
- [x] Add `maxBidIncrementCOP: number` to `PublicAuction` in `packages/shared/src/auction.ts`.

## Backend: creation validation

- [x] Write failing test: `auction.service.createAuction` rejects missing/non-integer/below-
      `MIN_BID_INCREMENT_COP` `maxBidIncrementCOP` with `fields.maxBidIncrementCOP`.
- [x] Write failing test: `auction.service.createAuction` persists a valid
      `maxBidIncrementCOP`.
- [x] Implement `maxBidIncrementCOP` in `CreateAuctionInput`, `validateMaxBidIncrement` helper,
      `validateCreateInput`, and the `createAuction` object literal
      (`apps/api/src/services/auction.service.ts`).
- [x] Add `maxBidIncrementCOP` to `Auction` (`apps/api/src/models/auction.ts`) and to
      `AuctionPatch` + `validateUpdatePatch` for draft-only edits.

## Backend: bid enforcement

- [x] Write failing test: `bid.service.placeBid` rejects a bid above the ceiling with 400 and
      `fields.amountCOP` naming both bounds.
- [x] Write failing test: `bid.service.placeBid` accepts a bid exactly at the ceiling.
- [x] Write failing test: with no existing bid, the ceiling is measured from `priceCOP`.
- [x] Implement passing `auction.maxBidIncrementCOP` into `isValidNextBid` and widening the
      error message in `apps/api/src/services/bid.service.ts`.

## Backend: storage and wire format

- [x] Write failing test: `auction.repository.json` `normalize()` backfills a legacy row with
      no `maxBidIncrementCOP` to `MAX_PRICE_COP`.
- [x] Implement the backfill in `apps/api/src/repositories/auction.repository.json.ts`.
- [x] Write failing test: creating an auction round-trips `maxBidIncrementCOP` through
      `toPublicAuction` in the route response.
- [x] Implement `'maxBidIncrementCOP'` in `CREATE_FIELDS` and `toPublicAuction`
      (`apps/api/src/routes/auction.routes.ts`).

## Frontend

- [x] Write failing test: the wizard's Pricing step blocks `Next` when `maxBidIncrementCOP` is
      missing or below `MIN_BID_INCREMENT_COP`, and passes it through to the `createAuction`
      call when valid.
- [x] Implement `maxBidIncrementCOP` in `CreateAuctionPayload`
      (`apps/web/src/lib/api-client.ts`), `EMPTY_VALUES`, `validateMaxBidIncrement`,
      `FIELD_VALIDATORS`, the `pricing` step's `fields`, and the `PricingStep` UI (a second
      `CurrencyInput` below the price, label "Max bid increment (COP)",
      `id="maxBidIncrementCOP"`) plus the review step's Pricing section
      (`apps/web/src/components/organisms/create-auction-wizard.tsx`).

## Fixtures (mechanical, after the above is green)

- [x] Add `maxBidIncrementCOP` to every `Auction`/`PublicAuction` test fixture so the
      workspaces compile: `auction.service.test.ts`, `routes/auction.routes.test.ts`,
      `bid.service.test.ts`, `publish-scheduler.test.ts`, `auction.repository.json.test.ts`,
      and web `makeAuction` helpers in `auction-card.test.tsx`, `auction-grid.test.tsx`,
      `auction-detail-page.test.tsx`, `api-client.test.ts`, `my-bids-page.test.tsx`,
      `my-auctions-page.test.tsx`, `auctions-page.test.tsx`, `purchases-page.test.tsx`,
      `create-auction-wizard.test.tsx`.
- [x] Update `apps/api/scripts/seed.ts` and `seed-e2e.ts` to pass a `maxBidIncrementCOP` for
      every seeded auction.

## Verification

- [x] `npm run test --workspace=packages/shared` — all green.
- [x] `npm run test --workspace=apps/api` — all green.
- [x] `npm run test --workspace=apps/web` — all green.
- [x] `npm run verify` — all green (typecheck, lint, format, coverage >85%).
- [ ] Manual check: re-seed, create an auction with a small cap, confirm a bid above the
      ceiling is rejected with a both-bounds message in the running app. (Not done — only
      automated tests were run; browser verification is still pending.)
- [x] Open PR from `feat/max-bid-increment` into `main`.
