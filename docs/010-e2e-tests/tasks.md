# Tasks — spec 010 Playwright E2E suite

No TDD in the usual red/green sense here (there's no unit under test — these tasks build the
harness itself); verification is "run the suite and see it pass/fail meaningfully," confirmed by
deliberately breaking one assertion per spec file once to see it fail, then fixing it back.

## Harness

- [x] `npm install -D @playwright/test` at the root.
- [x] `e2e/tsconfig.json` — standalone project config (DOM + node types, not part of any
      workspace's `tsconfig.build.json`).
- [x] `e2e/playwright.config.ts` — `testDir`, `use.baseURL` from `E2E_BASE_URL`
      (default `http://localhost:3000`), `webServer` running `npm run e2e:server` and waiting on
      `<baseURL>/health`, `reuseExistingServer: !process.env.CI`, a `setup` project running
      `auth.setup.ts`, and the main chromium project depending on it.
- [x] Root `.env.example` documenting `E2E_BASE_URL`.
- [x] Root `package.json`: `e2e`, `e2e:install`, `e2e:server` scripts.

## Deterministic seed

- [x] `apps/api/scripts/seed-e2e.ts` — clears `apps/api/data/*` then writes: `seller`
      (`3010000001`/`Password123`) and `bidder` (`3010000002`/`Password123`); a published
      "E2E No Bids Auction" (bidding.spec.ts); a published "E2E Realtime Auction"
      (realtime.spec.ts); a published "E2E Notifications Auction" (notifications spec — kept
      separate from the realtime one so the two specs never mutate the same auction); a `sold`
      "E2E Sold Auction" won by bidder (my-bids/purchases). No `Math.random()` anywhere in this
      script.
- [x] `apps/api/package.json`: `"seed:e2e": "tsx scripts/seed-e2e.ts"`.
- [x] Manual check: run `npm run seed:e2e --workspace=apps/api` twice in a row and confirm the
      second run doesn't fail on duplicate phone numbers (clears first).

## Auth setup

- [x] `e2e/tests/auth.setup.ts` — logs in as seller and bidder via the real `LoginForm`, saves
      `e2e/.auth/seller.json` and `e2e/.auth/bidder.json`.

## Spec files

- [x] `e2e/tests/auth.spec.ts`
- [x] `e2e/tests/browse-and-search.spec.ts`
- [x] `e2e/tests/create-and-publish-auction.spec.ts`
- [x] `e2e/tests/bidding.spec.ts`
- [x] `e2e/tests/realtime.spec.ts`
- [x] `e2e/tests/my-bids-and-purchases.spec.ts`
- [x] `e2e/tests/notifications-and-profile.spec.ts`

## Verification

- [x] `npm run e2e:install && npm run e2e` green end to end.
- [x] `npx playwright show-report` opens and shows every spec.
- [x] `npm run e2e` run twice in a row without manual cleanup, both green.
- [x] `npm run lint` and `npm run typecheck` at the root stay green with `e2e/` included.

## Bugs found by this suite

Building this suite surfaced two real issues, both now fixed:

- [x] **Fixed** — `GET /api/auth/me` (called on nearly every page load) shared the strict
      30-requests/15-minutes auth rate limiter with `/register` and `/login`; a full test suite's
      navigation exhausted it well before the suite finished. `auth.routes.ts` now applies that
      strict limiter only to `/register` and `/login`; `/me`, `/logout`, and the profile `PATCH`
      use the general browse limiter instead (`create-app.ts`, `auth.routes.ts`,
      `create-app.test.ts`).
- [x] **Fixed** — `e2e/tests/realtime.spec.ts` looked like it had found a live-update delivery
      bug (a bid placed in one browser context never appeared on a second, already-open context
      watching the same auction), but the root cause was in the _test_, not the app. `RealtimeConnection`
      reads the Zustand `useAuthStore`, which only a login or a guarded page's own fetch
      populates — a session restored via `storageState` starts with it empty, so the test visited
      `/profile` once to hydrate it. But the test then called `page.goto('/')` to get back to the
      grid — `goto()` is a real browser navigation (full reload), which throws away that
      in-memory store all over again (the home page never re-populates it, so the WebSocket never
      reconnects). Confirmed with a raw `ws` client and Playwright's `page.on('websocket')` frame
      inspection that the server-side broadcast was correct all along. Fixed by navigating via the
      in-app "Auctions" link instead of `goto()` after the `/profile` hydration step, so the store
      (and the WebSocket connection) survive the rest of the test as they would for a real user.
