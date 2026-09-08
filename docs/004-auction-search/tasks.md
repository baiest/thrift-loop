# 004 — Tasks

## packages/shared

- [ ] `title.ts` (`MAX_TITLE_LENGTH`, `TITLE_PATTERN`, `isValidTitle`) + test
- [ ] `auction.ts`: `Auction`/`PublicAuction` gain `title`

## apps/api

- [ ] `models/auction.ts`: add `title`
- [ ] `repositories/auction.repository.ts`: add `AuctionFilter`, widen `findAllPublished`
- [ ] `repositories/auction.repository.json.ts`: filter predicates, legacy-row title fallback + tests
- [ ] `lib/query-params.ts` (`pickQueryStrings`) + test
- [ ] `services/auction.service.ts`: `title` validation on create/update, third `userRepository`
      dependency, `AuctionSearchInput`, `listPublishedAuctions` sanitizes/filters + tests
- [ ] `routes/auction.routes.ts`: `GET /` parses query params + tests
- [ ] `container.ts`: pass `userRepository` to `createAuctionService`

## apps/web

- [ ] `hooks/use-debounced-value.ts` + test
- [ ] `lib/api-client.ts`: `fetchAuctions(filters)` builds query string + tests
- [ ] `components/organisms/auction-filters.tsx` + test
- [ ] `components/organisms/create-auction-form.tsx`: title field + max-length feedback + tests
- [ ] `components/molecules/auction-card.tsx`: show title + tests
- [ ] `pages/auction-detail-page.tsx`: show title
- [ ] `pages/auctions-page.tsx`: filter state, default city, debounce, memoized query + tests

## Wrap-up

- [ ] `npm run verify` green (typecheck, lint, format, coverage >85.01%, build)
- [ ] Manual smoke test per `plan.md`'s test strategy, incl. the `<script>`-shaped search/title
- [ ] Open PR, confirm all CI checks pass, leave merge to the user
