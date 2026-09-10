# Tasks — PR3: auth, auctions, rate-limit, CSRF

Follow-up to PR1/PR2 after auditing event coverage: auth and auction lifecycle, plus
rate-limit/CSRF rejections, had no dedicated events — only the generic `http_request` status
line. TDD throughout.

## `services/auth.service.ts`

- [ ] `createAuthService(userRepository, logger = NOOP_LOGGER)`.
- [ ] `auth_register_succeeded` (info: userId) on success.
- [ ] `auth_register_failed` (warning: reason `validation_failed` | `phone_taken`).
- [ ] `auth_login_succeeded` (info: userId) on success.
- [ ] `auth_login_failed` (warning: reason `user_not_found` | `invalid_password` — internal only,
      the user-facing error message stays generic).

## `services/auction.service.ts`

- [ ] `createAuctionService(auctionRepository, photoStorage, logger = NOOP_LOGGER)`.
- [ ] `auction_created` / `auction_updated` / `auction_deleted` (info: auctionId, userId).
- [ ] `photos_uploaded` (info: auctionId, userId, count) on success.
- [ ] `photo_upload_failed` (error: auctionId, userId, message) when `photoStorage.savePhotos`
      throws; rethrows unchanged.

## `lib/request-context.ts` / `lib/logger.ts`

- [ ] `runWithRequestId(requestId, fn, ip?)` accepts an optional client IP alongside the request
      id; a new `getIp()` reads it back, mirroring `getRequestId()`.
- [ ] `logger.ts`'s `buildEntry` includes `ip` on every entry when the active context carries one,
      the same way it already includes `requestId` — no call site passes `ip` as a field itself.
- [ ] `middlewares/request-logging.ts` passes `req.ip` into `runWithRequestId` once per request;
      every event logged downstream in that request (including rate-limit and CSRF rejections,
      which run after it in the middleware chain) picks up the IP automatically.

## `middlewares/rate-limit.ts`

- [ ] `createRateLimiter(options, logger = NOOP_LOGGER)` logs `rate_limit_exceeded` (warning: path)
      in the 429 handler.
- [ ] `create-app.ts` passes the app's logger into each rate limiter it builds.

## `lib/csrf.ts`

- [ ] `setCsrfLogger(logger)` (mutable default, same pattern as
      `setDefaultAsyncHandlerLogger` — keeps `requireCsrf` importable as a plain middleware with
      no signature change to route files).
- [ ] `csrf_rejected` (warning) logged before the 403 response.
- [ ] `index.ts` calls `setCsrfLogger(logger)` alongside `setDefaultAsyncHandlerLogger(logger)`.

## Wiring

- [ ] `container.ts`: thread `logger` into `createAuthService`/`createAuctionService`.

## Verification

- [ ] `npm run verify` green across all workspaces.
