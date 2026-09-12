# 018 — Plan: Max bid increment

## Approach

Add `maxBidIncrementCOP` as a new required domain field on `Auction`/`PublicAuction`, threaded
through the exact same layers `priceCOP` already flows through (routes → services →
repositories, per AGENTS.md). The rule itself lives in `packages/shared/src/bid.ts`, next to
`minimumNextBid`/`isValidNextBid`, since bid validation is already centralized there and used
by both the API service and (indirectly) the web form's minimum-bid hint.

Chosen over a separate "auction rules" sub-object or a ports-and-adapters style validator
service — the codebase's own architecture note says to keep this a layered monolith, not
hexagonal, and a single new field/function pair is proportional to that.

## Key decisions

- Decision: required field, not optional. — Rationale: confirmed with user; avoids a
  three-state UI (unset/no-cap/capped) and keeps `isValidNextBid`'s signature simple (no
  `| null` branching at every call site).
- Decision: ceiling measured from `priceCOP` when there's no bid yet. — Rationale: symmetric
  with `minimumNextBid`, which already treats `priceCOP` as the effective "current bid" before
  any bid exists.
- Decision: reject a cap below `MIN_BID_INCREMENT_COP` at creation time. — Rationale: once a
  bid exists, `minimum = current + MIN_BID_INCREMENT_COP` and `maximum = current + cap`; a
  smaller cap makes that range empty and no further bid could ever be placed.
- Decision: pre-existing stored auctions backfill to `MAX_PRICE_COP` on read (in
  `normalize()`), not a migration script. — Rationale: `auction.repository.json.ts` already
  establishes read-time legacy defaults as this repo's pattern (see its `LEGACY_CONDITION_MAP`
  comment); `MAX_PRICE_COP` reproduces today's effectively-uncapped behavior exactly.
- Decision: rejection reuses the existing `HttpError` + `fields.amountCOP` shape, message
  extended to name both bounds. — Rationale: `BidForm` already renders `fields.amountCOP`
  with no changes needed.

## Affected areas

- `packages/shared/src/bid.ts` (+ `bid.test.ts`), `src/auction.ts`
- `apps/api/src/models/auction.ts`
- `apps/api/src/services/auction.service.ts` (+ `.test.ts`)
- `apps/api/src/services/bid.service.ts` (+ `.test.ts`)
- `apps/api/src/repositories/auction.repository.ts`, `auction.repository.json.ts`
  (+ `.test.ts`)
- `apps/api/src/routes/auction.routes.ts` (+ `.test.ts`)
- `apps/api/scripts/seed.ts`, `seed-e2e.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/components/organisms/create-auction-wizard.tsx` (+ `.test.tsx`)
- Fixture/test factories across both workspaces that build an `Auction`/`PublicAuction`
  literal (see tasks.md for the full list) — mechanical, but required for compilation once the
  field is non-optional.

## Risks

- Risk: making the field required breaks compilation everywhere an `Auction` literal is
  built. — Mitigation: enumerated every known call site in tasks.md up front; let `tsc` catch
  anything missed, it cannot silently pass with a field missing.
- Risk: `validateCreateInput` in `auction.service.ts` exceeds the cognitive-complexity ≤ 10
  ESLint gate once a second price-like field is validated. — Mitigation: keep the new
  validation in its own small helper function (`validateMaxBidIncrement`), mirroring
  `validatePrice`, rather than inlining more branches into the existing function.
- Risk: forgetting the `MIN_BID_INCREMENT_COP` floor on the cap silently deadlocks an auction
  after its first bid (no further bid can ever be valid). — Mitigation: dedicated test in
  `bid.test.ts` (`isValidMaxBidIncrement` rejects a cap below `MIN_BID_INCREMENT_COP`) and in
  `auction.service.test.ts` (creation rejects it).

## Test strategy

TDD, one behavior at a time, failing test before implementation:

- Unit tests in `packages/shared/src/bid.test.ts` are the core of the logic and go first:
  `maximumNextBid` (from start price / from current bid / clamped at `MAX_PRICE_COP`) and
  `isValidNextBid`'s new upper-bound behavior, plus `isValidMaxBidIncrement`'s floor check.
- Service-level tests (`auction.service.test.ts`, `bid.service.test.ts`) cover the
  HTTP-error-shape contract: correct status code, correct `fields` key, correct message
  content — using the existing in-memory fake repositories, no real I/O.
- Repository test (`auction.repository.json.test.ts`) covers the legacy-row backfill via
  `normalize()`.
- Route test (`auction.routes.test.ts`) covers the field round-tripping through
  create → `toPublicAuction`.
- Web test (`create-auction-wizard.test.tsx`) covers the Pricing step blocking `Next` on an
  invalid value and the field reaching the `createAuction` payload.
- All existing tests for `priceCOP`-shaped behavior must keep passing unmodified except where
  a fixture literal needs the new required field added — that's a mechanical fixture change,
  not a behavior change, and is tracked as its own task so it isn't confused with TDD red/green
  work on the new rule itself.
