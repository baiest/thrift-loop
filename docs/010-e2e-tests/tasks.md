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
      (`3010000001`/`Password123`) and `bidder` (`3010000002`/`Password123`); a draft auction
      owned by seller; a published auction with zero bids; a published auction with one fixed-COP
      bid from bidder; a `sold` auction won by bidder; a published auction with a short
      `bidEndsAt` for realtime assertions. No `Math.random()` anywhere in this script.
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
