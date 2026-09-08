# 002 — Tasks

## packages/shared

- [ ] `item-category.ts` + test
- [ ] `item-condition.ts` + test
- [ ] `delivery-method.ts` + test
- [ ] `price.ts` + test
- [ ] `auction.ts` (`PublicAuction` type)

## apps/api — infra

- [ ] `lib/prefixed-id.ts` + test
- [ ] `models/user.ts`: add `updatedAt`; `auth.service.ts`: use `createPrefixedId('USR')`
- [ ] `lib/photo-storage.ts` + test
- [ ] `lib/publish-scheduler.ts` + test
- [ ] `middlewares/rate-limit.ts`: rename `createAuthRateLimiter` → `createRateLimiter`

## apps/api — auction domain

- [ ] `models/auction.ts`
- [ ] `repositories/auction.repository.ts` (interface) + `.json.ts` impl + test
- [ ] `services/auction.service.ts` (create/update/delete/list/get/addPhotos) + test, covering
      every acceptance criterion in `spec.md`
- [ ] `routes/auction.routes.ts` + test (supertest, incl. multipart)
- [ ] `container.ts`: wire auction repository/service/photo storage
- [ ] `create-app.ts`: mount `/api/auctions`, static `/uploads`
- [ ] `index.ts`: start the publish scheduler

## apps/web

- [ ] `components/atoms/select.tsx` + test
- [ ] `components/molecules/photo-uploader.tsx` + test
- [ ] `components/organisms/sidebar-nav.tsx` + test
- [ ] `pages/app-layout.tsx`
- [ ] `pages/create-auction-page.tsx` + test
- [ ] `lib/api-client.ts`: auction functions
- [ ] `app.tsx`: nested layout route

## Wrap-up

- [ ] `npm run verify` green (typecheck, lint, format, coverage >85%, build)
- [ ] Manual smoke test per plan.md's Verification section
- [ ] Open PR, confirm all CI checks pass, leave merge to the user
