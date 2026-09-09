# 005 — Tasks

## packages/shared

- [x] `description.ts` (`MAX_DESCRIPTION_LENGTH`, `isValidDescription`) + test
- [x] `item-condition.ts`: new taxonomy + test
- [x] `auction.ts`: `PublicAuction` gains `description`, `sellerCity`→`location`
- [x] `user.ts`: `PublicUser` gains `categoryPreference`

## apps/api

- [x] `models/auction.ts`: add `description`, `location`
- [x] `models/user.ts`: add `categoryPreference`
- [x] `repositories/auction.repository.ts`: `AuctionFilter` gains `location`
- [x] `repositories/auction.repository.json.ts`: legacy fallback (description/location),
      condition remap, `location` filter predicate + tests
- [x] `services/auction.service.ts`: description/location validation, fold `location` into
      `buildAuctionFilter`, drop `userRepository` dependency (2-arg factory) + tests
- [x] `services/auth.service.ts`: `categoryPreference` on register/update + tests
- [x] `routes/auction.routes.ts`: new fields, simplify `toPublicAuction` (no `userRepository`) + tests
- [x] `routes/auth.routes.ts`: `categoryPreference` field lists + tests
- [x] `container.ts`: revert `createAuctionService` call to two args

## apps/web

- [x] `components/atoms/textarea.tsx` + test
- [x] `components/organisms/create-auction-form.tsx`: description + location fields, default
      location from profile city + tests
- [x] `components/organisms/register-form.tsx`: category preference field + tests
- [x] `pages/profile-page.tsx`: category preference field + Log out button + tests
- [x] `pages/auction-detail-page.tsx`: show description + location + tests
- [x] `app.tsx`: `/` renders `AuctionsPage`, remove `/auctions` + test
- [x] `components/organisms/sidebar-nav.tsx`: "Auctions" link points to `/` + test
- [x] Delete `pages/home-page.tsx` and `home-page.test.tsx`

## apps/web — Publish now (found after initial pass: a newly created draft was unreachable)

- [x] `components/organisms/create-auction-form.tsx`: `onSuccess` passes the created auction's id
- [x] `pages/create-auction-page.tsx`: navigate to `/auctions/:id` (not `/`) after creating
- [x] `pages/auction-detail-page.tsx`: "Publish now" button, owner + draft only, calls
      `updateAuction(id, { status: 'published' })` and reloads + tests

## apps/web — My auctions (found after initial pass: no way to see your own drafts)

- [x] `components/molecules/auction-card.tsx`: "Draft" badge for `status === 'draft'` + tests
- [x] `pages/my-auctions-page.tsx`: lists `fetchMyAuctions()`, redirects anonymous viewers to
      `/login`, reuses `AuctionGrid` + tests
- [x] `app.tsx`: `/auctions/mine` route (declared before `/auctions/:id`)
- [x] `components/organisms/sidebar-nav.tsx`: "My auctions" link + test

## Wrap-up

- [x] `npm run verify` green (typecheck, lint, format, coverage >85.01%, build)
- [ ] Manual smoke test per `plan.md`'s test strategy
- [ ] Open PR, confirm all CI checks pass, leave merge to the user
