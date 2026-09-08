# 004 — Plan

## Approach

Two independent-but-related additions to the existing auction domain: (1) a `title` field,
closing a gap left open in spec 002, and (2) a query-param filter contract on
`GET /api/auctions`, designed with two extensibility seams so future filters are additive.

## Key decisions

- **`title` is required at creation**, max 80 chars, whitelist charset (`\p{L}\p{N}\s.,'"()#/-`)
  validated the same way every other creation field is (service throws a 400 field error).
  Legacy rows without a title get a normalized fallback (humanized category) in the JSON
  repository's existing legacy-row normalizer — no migration script, no data loss.
- **Two extensibility seams for filters**:
  1. Filters on an `Auction`-native field (search/category/price today) live in
     `AuctionFilter` + one predicate in the repository's `findAllPublished`.
  2. Filters needing another entity's data (city, via the seller's `User.city`) live in the
     service, which now depends on `userRepository` too — the same "inject what you need to
     join against" pattern `bid.service.ts` already established in spec 003.
- **Read path is forgiving, write path is strict**: `title` on `POST`/`PATCH` is validated and
  rejected on failure; `search`/`category`/`city`/`minPriceCOP`/`maxPriceCOP` on `GET` are
  sanitized/ignored on failure — a browse endpoint should never 400 because of a stray character
  or a typo'd filter.
- **Debounce + memoization on the frontend**: a new generic `useDebouncedValue` hook (first hook
  in the app) delays the fetch trigger; a `useMemo`'d query-params object keeps the fetch effect
  from re-firing on unrelated renders.
- **City defaults from the viewer's profile**, not enforced — an initial value the user can still
  change or clear via the same `SearchableSelect` used at registration.

## Data model

```ts
// apps/api/src/models/auction.ts — Auction gains:
title: string;
```

```ts
// apps/api/src/repositories/auction.repository.ts
export interface AuctionFilter {
  search?: string;
  category?: ItemCategory;
  minPriceCOP?: number;
  maxPriceCOP?: number;
}
```

## API contract

`GET /api/auctions?search=&category=&city=&minPriceCOP=&maxPriceCOP=` (public, all params
optional) — `{ auctions: PublicAuction[] }`, same shape as today, now filterable. Invalid/
unparseable param values are ignored rather than rejected.

`POST /api/auctions` / `PATCH /api/auctions/:id` — gain `title` in the body, validated like every
other field; 400 with `{ fields: { title: '...' } }` on failure.

## Affected areas

- `packages/shared/src/title.ts` (+ test), extended `auction.ts`.
- `apps/api/src/models/auction.ts` (extended).
- `apps/api/src/repositories/auction.repository.ts` (extended interface),
  `auction.repository.json.ts` (extended `findAllPublished` + legacy-row normalizer) (+ tests).
- `apps/api/src/services/auction.service.ts` (extended: `title` validation, third `userRepository`
  dependency, `listPublishedAuctions(AuctionSearchInput)`) (+ tests).
- `apps/api/src/lib/query-params.ts` (new, `pickQueryStrings`) (+ test).
- `apps/api/src/routes/auction.routes.ts` (extended `GET /` handler) (+ tests).
- `apps/api/src/container.ts` (one-line: pass `userRepository` to `createAuctionService`).
- `apps/web/src/hooks/use-debounced-value.ts` (new) (+ test).
- `apps/web/src/components/organisms/{create-auction-form,auction-filters (new)}.tsx`,
  `components/molecules/auction-card.tsx`, `pages/{auctions-page,auction-detail-page}.tsx`
  (extended), `lib/api-client.ts` (extended `fetchAuctions`) (+ tests).

## Risks

- In-memory filtering over the full JSON array — fine at current scale, same limitation every
  other list endpoint already has.
- City filter cost scales with survivors of the Auction-native filters, not the whole dataset.

## Test strategy (TDD)

- `packages/shared`: `title.test.ts` — accept/reject table incl. a `<script>`-shaped payload and
  an over-length string.
- `apps/api`: extended `auction.repository.json.test.ts` (filter predicates, legacy-title
  fallback), `lib/query-params.test.ts` (array/object query value is ignored), extended
  `auction.service.test.ts` (title validation, search sanitization, invalid filter values
  ignored, city join), extended `auction.routes.test.ts` (query-string integration via
  supertest).
- `apps/web`: `use-debounced-value.test.ts` (fake timers), `auction-filters.test.tsx`, extended
  `auctions-page.test.tsx` (default city from user, debounced fetch), extended
  `create-auction-form.test.tsx` (title field + max-length feedback).
