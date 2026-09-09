# 005 — Plan

## Approach

Five independent, narrow additions to the existing auction/user domains, following the same
validation and legacy-normalization idioms already established in specs 003/004. The one
structural change is folding `location` into `AuctionFilter` as a native field, which lets
`createAuctionService` drop the `userRepository` dependency spec 004 added solely for the
now-unnecessary city join.

## Key decisions

- **Description**: 500 chars, multi-line, reuses `title.ts`'s `TITLE_PATTERN` whitelist (already
  permits newlines via `\s`) — new `Textarea` atom, first one in the app.
- **Condition taxonomy**: `['good', 'new-with-tag', 'unused', 'worn']`. Legacy rows remapped at
  read time via a lookup table (`new`→`new-with-tag`, `like-new`→`unused`, `fair`→`worn`,
  `good`/`worn` unchanged).
- **Home page**: `/` becomes `AuctionsPage` (already public, already has filters from spec 004).
  `home-page.tsx` is deleted; its Log out button moves to `ProfilePage`.
- **Category preference**: optional at registration, editable later — same convention as
  `address`.
- **Location**: real `Auction`-native field, defaults from the seller's own city on the frontend
  only (backend just validates whatever is submitted, like every other required field). Replaces
  the join-derived `sellerCity`; `createAuctionService` reverts to two args
  (`auctionRepository`, `photoStorage`).

## Data model

```ts
// apps/api/src/models/auction.ts — Auction gains:
description: string;
location: string;
```

```ts
// apps/api/src/models/user.ts — User gains:
categoryPreference: ItemCategory | null;
```

## API contract

`POST /api/auctions` / `PATCH /api/auctions/:id` — body gains `description`, `location`, both
validated and rejected with a field error on failure, same as `title`/`category` today.

`GET /api/auctions?city=<value>` — now filters directly on `Auction.location`, no per-result user
lookup.

`POST /api/auth/register` / `PATCH /api/auth/me` — body gains `categoryPreference` (empty string
= no preference = `null`; a non-empty value must be a real category).

## Affected areas

- `packages/shared/src/{description.ts (new), item-condition.ts, auction.ts, user.ts}` (+ tests).
- `apps/api/src/models/{auction.ts, user.ts}`.
- `apps/api/src/repositories/auction.repository.{ts,json.ts}` (+ tests).
- `apps/api/src/services/{auction.service.ts, auth.service.ts}` (+ tests).
- `apps/api/src/routes/{auction.routes.ts, auth.routes.ts}` (+ tests).
- `apps/api/src/container.ts`.
- `apps/web/src/components/atoms/textarea.tsx` (new, + test).
- `apps/web/src/components/organisms/{create-auction-form.tsx, register-form.tsx, sidebar-nav.tsx}` (+ tests).
- `apps/web/src/pages/{profile-page.tsx, auction-detail-page.tsx}` (+ tests).
- `apps/web/src/pages/home-page.tsx` + test — deleted.
- `apps/web/src/app.tsx` (+ test).

## Risks

- Legacy remaps (condition, description/location fallback) are best-effort, read-time only, same
  pattern already used for spec 003/004's own legacy fields.

## Test strategy (TDD)

- `packages/shared`: `description.test.ts`, updated `item-condition` coverage (implicit, no
  dedicated test file previously — add one if none exists), extended type tests where applicable.
- `apps/api`: extended `auction.repository.json.test.ts` (description/location fallback,
  condition remap, location filter predicate), extended `auction.service.test.ts`
  (description/location validation, dropped userRepository dependency), extended
  `auth.service.test.ts` (categoryPreference), extended route tests (supertest).
- `apps/web`: `textarea.test.tsx`, extended `create-auction-form.test.tsx` (description, location
  default-from-profile), extended `register-form.test.tsx` (category preference), extended
  `profile-page.test.tsx` (category preference + log out), extended `app.test.tsx` (`/` shows the
  grid), `sidebar-nav.test.tsx` (link update).
