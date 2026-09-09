# 004 — Tasks

## packages/shared

- [x] `title.ts` (`MAX_TITLE_LENGTH`, `TITLE_PATTERN`, `isValidTitle`) + test
- [x] `auction.ts`: `Auction`/`PublicAuction` gain `title`

## apps/api

- [x] `models/auction.ts`: add `title`
- [x] `repositories/auction.repository.ts`: add `AuctionFilter`, widen `findAllPublished`
- [x] `repositories/auction.repository.json.ts`: filter predicates, legacy-row title fallback + tests
- [x] `lib/query-params.ts` (`pickQueryStrings`) + test
- [x] `services/auction.service.ts`: `title` validation on create/update, third `userRepository`
      dependency, `AuctionSearchInput`, `listPublishedAuctions` sanitizes/filters + tests
- [x] `routes/auction.routes.ts`: `GET /` parses query params + tests
- [x] `container.ts`: pass `userRepository` to `createAuctionService`

## apps/web

- [x] `hooks/use-debounced-value.ts` + test
- [x] `lib/api-client.ts`: `fetchAuctions(filters)` builds query string + tests
- [x] `components/organisms/auction-filters.tsx` + test
- [x] `components/organisms/create-auction-form.tsx`: title field + max-length feedback + tests
- [x] `components/molecules/auction-card.tsx`: show title + tests
- [x] `pages/auction-detail-page.tsx`: show title
- [x] `pages/auctions-page.tsx`: filter state, default city, debounce, memoized query + tests

## Wrap-up

- [x] `npm run verify` green (typecheck, lint, format, coverage >85.01%, build)
- [x] Manual smoke test per `plan.md`'s test strategy, incl. the `<script>`-shaped search/title
- [x] Open PR, confirm all CI checks pass, leave merge to the user
