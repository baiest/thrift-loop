# 003 — Plan

## Approach

Adds a third domain (`bid`) alongside `auth`/`auction`, following the same
`routes → services → repositories` layering. The one genuinely new piece of infrastructure is a
concurrency lock: this is the first feature where two requests race to mutate the same record.

## Key decisions

- **In-process keyed mutex** (`lib/keyed-mutex.ts`) serializes all reads+writes for one auction
  id, so "only the first bid at the current price wins" is enforced as a single indivisible
  critical section, not a race between separate read/write calls. Injected into `bid.service.ts`
  and reused by the closing scheduler so a bid can never land in the same instant an auction
  closes. **Single-process only** — documented as a risk, not solved, for multi-instance scale.
- **Atomic JSON writes** (`lib/json-file-store.ts`: write to a temp file, then `rename`) back the
  mutex — otherwise a crash mid-write could still corrupt the file the mutex is protecting.
- **30-minute window resets on every bid** (anti-sniping), starts only on the first bid — a
  published auction with zero bids never expires.
- **Fixed minimum increment** (`MIN_BID_INCREMENT_COP = 1000`) — the first bid may equal the
  asking price; every bid after must beat the current bid by at least the increment.
- **No self-outbid restriction** — the current leader may raise their own bid.
- **Editing locked once bidding starts** — `PATCH /:id` on an auction with `bidCount > 0` is 409,
  even while `status` is still `published`.
- **Public browsing** — grid and detail need no session; only placing a bid does.
- **Address lives on the user profile**, not captured at purchase time; resolved against the
  auction's delivery method to decide shipping vs. pickup.

## Data model

```ts
// apps/api/src/models/bid.ts
interface Bid {
  id: string; // BID-<uuid>
  auctionId: string;
  userId: string;
  amountCOP: number;
  createdAt: string;
}
```

`apps/api/src/models/auction.ts` gains: `currentBidCOP: number | null`,
`currentBidderId: string | null`, `bidEndsAt: string | null`, `winnerUserId: string | null`.
`AuctionStatus` gains `'sold'`. Rows written before this spec lack these fields — the JSON
repository normalizes missing fields to `null`/`0` on read.

`apps/api/src/models/user.ts` gains `address: string | null`.

## API contract

`GET /api/auctions` (public) — `{ auctions: PublicAuction[] }`, published + sold, newest first.

`GET /api/auctions/:id` (public) — `{ auction: PublicAuction, serverTime: string }`, 404 if
missing or still a draft.

`GET /api/auctions/:id/bids` (public) — `{ bids: PublicBid[] }`, newest first.

`POST /api/auctions/:id/bids` (auth + CSRF) — `{ amountCOP: string }` → 201
`{ auction, bid }`; 400 field error, 403 own auction, 404, 409 not open/closed.

`GET /api/purchases` (auth) — `{ purchases: PublicPurchase[] }`, each with a resolved
`handover: { mode: 'delivery', address } | { mode: 'pickup', city }`.

`PATCH /api/auth/me` (auth + CSRF) — `{ address }` → 200 `{ user }`.

## Affected areas (new)

- `packages/shared/src/bid.ts` (+ test), extended `auction.ts`, `user.ts`.
- `apps/api/src/lib/{keyed-mutex,json-file-store}.ts` (+ tests).
- `apps/api/src/models/bid.ts`, extended `models/auction.ts`, `models/user.ts`.
- `apps/api/src/repositories/bid.repository*.ts` (+ tests); extended
  `auction.repository*.ts`, `user.repository*.ts` (+ tests).
- `apps/api/src/services/bid.service.ts` (+ test, incl. a genuine concurrency test); extended
  `auction.service.ts`, `auth.service.ts` (+ tests).
- `apps/api/src/lib/publish-scheduler.ts` extended with `closeDueAuctions`/
  `startAuctionScheduler` (+ tests).
- `apps/api/src/routes/auction.routes.ts` (extended), `auth.routes.ts` (extended) (+ tests).
- `apps/api/src/{container.ts, create-app.ts, index.ts}` (touched; `create-app.ts` refactored to
  an options object as its own commit before the feature).
- `apps/web/src/lib/{api-client.ts (extended), format.ts (new)}`,
  `components/atoms/badge.tsx`, `components/molecules/{countdown,auction-card,bid-history}.tsx`,
  `components/organisms/{bid-form,auction-grid}.tsx`,
  `pages/{auctions-page,auction-detail-page,purchases-page,profile-page}.tsx`,
  `components/organisms/sidebar-nav.tsx` (extended), `app.tsx` (extended).

## Risks

- **Lock is single-process.** Correct for one API instance; would need a database-backed atomic
  update (e.g. Mongo `findOneAndUpdate`) to survive horizontal scaling. Not a concern at the
  current single-instance scale.
- **Scheduler tick granularity (~60s)**: `status` can lag the true deadline briefly. The API's own
  bid-time guard (`bidEndsAt <= now`) is authoritative regardless of the scheduler's timing, so no
  bid can ever land after the true deadline even if `status` hasn't flipped yet.
- **No buyer↔seller contact channel** beyond the resolved address/pickup city — flagged as the
  likely next real gap, not solved here.

## Test strategy (TDD)

- `packages/shared`: `bid.test.ts` table-driven (same pattern as `price.test.ts`), extended
  `auction`/`user` tests where applicable.
- `apps/api`: `lib/keyed-mutex.test.ts` (concurrent tasks on the same key serialize, different
  keys interleave, a rejecting task doesn't wedge the queue), `lib/json-file-store.test.ts`,
  `bid.repository.json.test.ts` (real temp-dir I/O, same pattern as the existing JSON repo
  tests), `bid.service.test.ts` — including firing concurrent `placeBid` calls with
  `Promise.all` and asserting exactly one succeeds — this is the acceptance test for the lock,
  `auction.routes.test.ts` extended with bid routes (supertest), `auth.routes.test.ts` extended
  with `PATCH /me`.
- `apps/web`: `Countdown` with `vi.useFakeTimers()`, `AuctionCard` covering the no-photo case,
  `BidForm` covering client-side validation matching the shared minimum, page-level tests
  stubbing `fetch` the same way existing pages do.
