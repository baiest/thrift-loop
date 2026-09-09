# 005 — Tasks

## packages/shared

- [ ] `description.ts` (`MAX_DESCRIPTION_LENGTH`, `isValidDescription`) + test
- [ ] `item-condition.ts`: new taxonomy + test
- [ ] `auction.ts`: `PublicAuction` gains `description`, `sellerCity`→`location`
- [ ] `user.ts`: `PublicUser` gains `categoryPreference`

## apps/api

- [ ] `models/auction.ts`: add `description`, `location`
- [ ] `models/user.ts`: add `categoryPreference`
- [ ] `repositories/auction.repository.ts`: `AuctionFilter` gains `location`
- [ ] `repositories/auction.repository.json.ts`: legacy fallback (description/location),
      condition remap, `location` filter predicate + tests
- [ ] `services/auction.service.ts`: description/location validation, fold `location` into
      `buildAuctionFilter`, drop `userRepository` dependency (2-arg factory) + tests
- [ ] `services/auth.service.ts`: `categoryPreference` on register/update + tests
- [ ] `routes/auction.routes.ts`: new fields, simplify `toPublicAuction` (no `userRepository`) + tests
- [ ] `routes/auth.routes.ts`: `categoryPreference` field lists + tests
- [ ] `container.ts`: revert `createAuctionService` call to two args

## apps/web

- [ ] `components/atoms/textarea.tsx` + test
- [ ] `components/organisms/create-auction-form.tsx`: description + location fields, default
      location from profile city + tests
- [ ] `components/organisms/register-form.tsx`: category preference field + tests
- [ ] `pages/profile-page.tsx`: category preference field + Log out button + tests
- [ ] `pages/auction-detail-page.tsx`: show description + location + tests
- [ ] `app.tsx`: `/` renders `AuctionsPage`, remove `/auctions` + test
- [ ] `components/organisms/sidebar-nav.tsx`: "Auctions" link points to `/` + test
- [ ] Delete `pages/home-page.tsx` and `home-page.test.tsx`

## Wrap-up

- [ ] `npm run verify` green (typecheck, lint, format, coverage >85.01%, build)
- [ ] Manual smoke test per `plan.md`'s test strategy
- [ ] Open PR, confirm all CI checks pass, leave merge to the user
