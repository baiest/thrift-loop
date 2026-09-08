# 002 — Plan

## Approach

Mirrors the `auth` file set exactly, per `AGENTS.md`'s documented backend pattern
(`routes → services → repositories`, factory functions, `asyncHandler`/`HttpError`/
`pickStringFields`). This is the second domain added to the backend, so it's also where that
pattern gets proven out on something other than auth.

## Key decisions

- **Multiple auctions per user** — no 1-per-user limit.
- **Real background scheduler** for `publishAt`, not lazy computed-on-read status. A pure
  `publishDueAuctions(auctionRepository, now)` function does the work (fully unit-testable, no
  real timers needed); `startPublishScheduler(...)` is the thin `setInterval` wrapper, started
  from `index.ts`.
- **Condition taxonomy**: `new`, `like-new`, `good`, `fair`, `worn`.
- **Delivery method**: `pickup` | `delivery` | `both`.
- **Photo limits**: JPEG/PNG/WebP, 5 MB/file, 10 files/auction — enforced by `multer` at the HTTP
  layer (type/size) and by the service (total count).
- **Local disk storage** behind a factory (`lib/photo-storage.ts`), same swap-later story as
  `UserRepository` → Mongo. Not S3 now — no cloud infra exists yet, not invented here.
- **Public static photo URLs** (`/uploads/...`) — an auction is inherently public-facing; no
  private-photo access gate invented for this spec.
- **`GET /api/auctions/mine` and `GET /api/auctions/:id`** are necessary companions (same
  reasoning as spec 001's `/me`/`/logout`) — without them the create flow has no way to confirm
  what was created.
- **ID generation stays backend-only** — `node:crypto`'s `randomUUID` isn't available in the
  browser bundle, so `lib/prefixed-id.ts` lives in `apps/api`, not `packages/shared`.
- **No title/description** — not requested; flagged in `spec.md` as a follow-up gap.

## Data model

```ts
// apps/api/src/models/auction.ts
interface Auction {
  id: string; // AUC-<uuid>
  userId: string; // USR-<uuid>
  category: ItemCategory;
  condition: ItemCondition;
  priceCOP: number; // positive integer
  publishAt: string | null; // ISO date, optional
  status: 'draft' | 'published';
  deliveryMethod: DeliveryMethod;
  photoKeys: string[]; // relative paths under data/uploads/
  createdAt: string;
  updatedAt: string;
}
```

`apps/api/src/models/user.ts` gains `updatedAt: string` (auditing applies to every model, not
just the new one).

## API contract

`POST /api/auctions` — body: category/condition/deliveryMethod/priceCOP/publishAt (all strings,
parsed and validated in the service, same as auth's phone/password strings). 201 `{ auction }`.

`PATCH /api/auctions/:id` — any editable field, including `status: "published"`. 200 `{ auction }`,
404 (not found or not owned), 409 (already published).

`DELETE /api/auctions/:id` — 204, 404 (not found or not owned).

`GET /api/auctions/mine` — 200 `{ auctions: [] }`, owner's own only.

`GET /api/auctions/:id` — 200 `{ auction }`, 404 (not found or not owned).

`POST /api/auctions/:id/photos` — multipart, field name `photos`, up to 10 files. 200
`{ auction }` with updated `photoKeys`/URLs. 400 (bad file type/size), 409 (would exceed 10 or
not draft), 404 (not found or not owned).

## Affected areas (new)

- `packages/shared/src/{item-category,item-condition,delivery-method,price,auction}.ts`
- `apps/api/src/models/auction.ts`, `repositories/auction.repository*.ts`,
  `services/auction.service.ts`, `routes/auction.routes.ts`,
  `lib/{prefixed-id,photo-storage,publish-scheduler}.ts`
- `apps/api/src/{models/user.ts, services/auth.service.ts, container.ts, create-app.ts, index.ts, middlewares/rate-limit.ts}` (touched, not rewritten)
- `apps/web/src/pages/{app-layout,create-auction-page}.tsx`,
  `components/organisms/sidebar-nav.tsx`, `components/atoms/select.tsx`,
  `components/molecules/photo-uploader.tsx`, `lib/api-client.ts` (extended), `app.tsx` (nested
  route)

## Risks

- **Railway's ephemeral filesystem**: local disk storage (both `data/*.json` and
  `data/uploads/`) doesn't survive a redeploy without a persistent volume. Already true today for
  user data; this spec doesn't newly introduce or solve it — just flagging it applies to photos
  too.
- **Scheduler + multiple server instances**: a naive `setInterval` scheduler would double-publish
  if the API ever runs as more than one instance. Not a concern at the current single-instance
  scale; worth revisiting if that changes.

## Test strategy (TDD)

- `packages/shared`: one `*.test.ts` per validator, table-driven, same pattern as
  `colombia-cities.test.ts`.
- `apps/api`: `lib/prefixed-id.test.ts`, `lib/photo-storage.test.ts` (real temp-dir I/O, same
  pattern as `user.repository.json.test.ts`), `lib/publish-scheduler.test.ts` (fake repository +
  fixed/injected `now`, no real timers for the pure function), `auction.service.test.ts` (fake
  repository + fake photo storage, covers every acceptance criterion), `auction.routes.test.ts`
  (supertest, incl. multipart upload via `.attach()`).
- `apps/web`: `Select`/`PhotoUploader` component tests, `create-auction-page` covers client-side
  validation and submit wiring, `sidebar-nav` covers the mobile toggle behavior.
