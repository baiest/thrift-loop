# Tasks — spec 010 Playwright E2E suite

No TDD in the usual red/green sense here (there's no unit under test — these tasks build the
harness itself); verification is "run the suite and see it pass/fail meaningfully," confirmed by
deliberately breaking one assertion per spec file once to see it fail, then fixing it back.

## Harness

- [ ] `npm install -D @playwright/test` at the root.
- [ ] `e2e/tsconfig.json` — standalone project config (DOM + node types, not part of any
      workspace's `tsconfig.build.json`).
- [ ] `e2e/playwright.config.ts` — `testDir`, `use.baseURL` from `E2E_BASE_URL`
      (default `http://localhost:3000`), `webServer` running `npm run e2e:server` and waiting on
      `<baseURL>/health`, `reuseExistingServer: !process.env.CI`, a `setup` project running
      `auth.setup.ts`, and the main chromium project depending on it.
- [ ] Root `.env.example` documenting `E2E_BASE_URL`.
- [ ] Root `package.json`: `e2e`, `e2e:install`, `e2e:server` scripts.

## Deterministic seed

- [ ] `apps/api/scripts/seed-e2e.ts` — clears `apps/api/data/*` then writes: `seller`
      (`3010000001`/`Password123`) and `bidder` (`3010000002`/`Password123`); a published
      "E2E No Bids Auction" (bidding.spec.ts); a published "E2E Realtime Auction"
      (realtime.spec.ts); a published "E2E Notifications Auction" (notifications spec — kept
      separate from the realtime one so the two specs never mutate the same auction); a `sold`
      "E2E Sold Auction" won by bidder (my-bids/purchases). No `Math.random()` anywhere in this
      script.
- [ ] `apps/api/package.json`: `"seed:e2e": "tsx scripts/seed-e2e.ts"`.
- [ ] Manual check: run `npm run seed:e2e --workspace=apps/api` twice in a row and confirm the
      second run doesn't fail on duplicate phone numbers (clears first).

## Auth setup

- [ ] `e2e/tests/auth.setup.ts` — logs in as seller and bidder via the real `LoginForm`, saves
      `e2e/.auth/seller.json` and `e2e/.auth/bidder.json`.

## Spec files

- [ ] `e2e/tests/auth.spec.ts`
- [ ] `e2e/tests/browse-and-search.spec.ts`
- [ ] `e2e/tests/create-and-publish-auction.spec.ts`
- [ ] `e2e/tests/bidding.spec.ts`
- [ ] `e2e/tests/realtime.spec.ts`
- [ ] `e2e/tests/my-bids-and-purchases.spec.ts`
- [ ] `e2e/tests/notifications-and-profile.spec.ts`

## Verification

- [ ] `npm run e2e:install && npm run e2e` green end to end.
- [ ] `npx playwright show-report` opens and shows every spec.
- [ ] `npm run e2e` run twice in a row without manual cleanup, both green.
- [ ] `npm run lint` and `npm run typecheck` at the root stay green with `e2e/` included.

## Bugs found by this suite

Building this suite surfaced two real issues, one fixed here and one left open for a dedicated
follow-up:

- [x] **Fixed** — `GET /api/auth/me` (called on nearly every page load) shared the strict
      30-requests/15-minutes auth rate limiter with `/register` and `/login`; a full test suite's
      navigation exhausted it well before the suite finished. `auth.routes.ts` now applies that
      strict limiter only to `/register` and `/login`; `/me`, `/logout`, and the profile `PATCH`
      use the general browse limiter instead (`create-app.ts`, `auth.routes.ts`,
      `create-app.test.ts`).
- [ ] **Open, tracked, not fixed** — `e2e/tests/realtime.spec.ts` (marked `test.fail()`): a bid
      placed in one browser context does not visibly update a second, already-open browser
      context watching the same auction detail page, even though the WebSocket upgrade succeeds
      (confirmed via trace: HTTP 101) and the bid itself succeeds (HTTP 201). Ruled out during
      investigation: the CORS/origin rejection that a single-origin (`E2E_BASE_URL=http://localhost:3000`)
      test run needs `ALLOWED_ORIGINS` set for (now documented in `apps/api/.env.example`), the
      auth-store hydration gap where `RealtimeConnection` reads `useAuthStore` but a session
      restored from Playwright's `storageState` never populates it the way a real login does (the
      test now visits `/profile` once first to force that hydration), and slow delivery (absent
      even after a 15s wait). The remaining suspects are in `apps/web/src/lib/realtime-client.ts`,
      `apps/web/src/stores/realtime-store.ts`, or the server's `realtime-hub.ts`/`event-fanout.ts`
      room-broadcast path — needs its own investigation session with WebSocket-frame-level
      tracing, not more E2E-side guessing.
