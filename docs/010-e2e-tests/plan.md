# Spec 010 — Playwright E2E suite for the web app

## Context

The project has thorough unit/component coverage (Vitest + Testing Library in both
`apps/web` and `apps/api`, 85%+ gate) but nothing exercises the real stack end to end: browser
→ built frontend → API → JSON repositories → WebSocket. Bugs that only show up at the
integration seam have bitten this project before (the `notificationService` 404 found only by
manual browser testing, spec 008). The user wants a Playwright suite that (a) covers every
capability the platform has shipped to date (specs 001–008: auth, browsing/search, listing
creation, bidding, my-bids, notifications/realtime, purchases) and (b) doubles as a runnable
demonstration of the system — Playwright's own HTML report/trace viewer serves that need well,
so no separate "demo mode" is required.

Per the user's choices: tests drive the **production build**, single-origin, served by the API
(`WEB_DIST_PATH`) — not the Vite dev server — because that's the closest thing to what real users
hit. Sessions for tests that need to be logged in are established **once via the real login UI**
and reused via Playwright's `storageState` (fast, and still exercises the real login form at
least once per role). Test data comes from a **new, dedicated, deterministic E2E seed** —
`scripts/seed.ts`'s bid amounts are randomized and its dataset is shared with manual dev use, both
wrong for assertions that need exact, stable values. The target base URL is one environment
variable, easy to repoint at a real/staging server later.

## Key decisions

- **Location: root-level `e2e/` directory, not an `apps/*` workspace.** The suite spans frontend
  and backend and isn't itself a package other code imports; keeping it out of the npm workspaces
  list also keeps it out of `scripts/run-workspace-script.ts`'s fan-out (so `npm run test`/
  `test:cov`'s 85% coverage gate never sees it) and out of `apps/web`'s own Vitest config (Vitest
  and Playwright both use `*.spec.ts`/`*.test.ts`-ish patterns; a separate directory with its own
  `tsconfig.json` avoids any collision). `@playwright/test` is a root `devDependency`.
- **Target: the production build, single-origin, via one env var.** `playwright.config.ts` reads
  `E2E_BASE_URL` (default `http://localhost:3000`, matching `apps/api`'s default `PORT`) for
  `use.baseURL`. Repointing at a real/staging server later is exactly that one variable — no code
  change. A `webServer` entry builds `packages/shared` + `apps/web`, seeds, then starts
  `apps/api` (which serves the built SPA via its existing `WEB_DIST_PATH` + SPA-fallback logic in
  `create-app.ts` — no new server code needed); Playwright waits on `GET /health`.
- **A new, dedicated, deterministic seed — not `scripts/seed.ts`.** `apps/api/scripts/seed-e2e.ts`
  (new) builds the container directly (same pattern as `seed.ts`) and writes a small, fixed
  dataset with no `Math.random()`: two named users (`seller`/`bidder`, fixed phones, password
  `Password123`) plus a handful of auctions covering every status a test needs — a draft owned by
  seller, a published auction with zero bids, one with a known bid history (fixed COP amounts, so
  "current bid" and "minimum next bid" are assertable exactly), one already `sold` with a known
  winner (for purchases/my-bids), and one `published` with a short, test-controlled `bidEndsAt`
  for the realtime/close-scheduler-adjacent assertions. `npm run seed:e2e` (new, in
  `apps/api/package.json`) runs it; it always clears first (idempotent, safe to rerun).
- **Auth via UI + `storageState`, once per role, via a Playwright "setup project."** A
  `e2e/tests/auth.setup.ts` project (Playwright's documented pattern) logs in as `seller` and as
  `bidder` through the real `LoginForm` (`#phone`/`#password`, matching
  `apps/web/src/components/organisms/login-form.tsx`) and saves
  `e2e/.auth/seller.json`/`bidder.json`. Every other test file that needs a session declares
  `test.use({ storageState: 'e2e/.auth/<role>.json' })` and depends on the setup project — no
  test logs in more than once, which also avoids tripping the auth rate limiter (30 req/15 min,
  `apps/api/src/middlewares/rate-limit.ts`) across a full suite run.
- **Selector strategy: roles/labels/text, matching the codebase's existing convention.** There are
  no `data-testid` attributes in `apps/web` today (confirmed by exploration) and its own
  Testing Library tests already lean on `getByLabel`/`getByRole`; Playwright tests follow the same
  convention (`page.getByLabel('Phone number')`, `page.getByRole('button', { name: 'Place bid' })`)
  so the two test layers stay stylistically consistent and neither one needs a `data-testid` sweep.
- **Realtime is tested for real, with two browser contexts, not mocked.** A dedicated
  `realtime.spec.ts` opens a `seller` context and a `bidder` context side by side: the bidder
  places a bid through the real `BidForm`, and the test asserts the seller's already-open detail
  page and grid card update live (via `use-auction-realtime.ts`/`use-grid-realtime.ts`) without a
  reload, and that the seller's notification bell badge increments — using Playwright's
  auto-retrying `expect(locator).toHaveText(...)` rather than fixed `waitForTimeout`s, per the
  explored codebase's own flakiness notes (ticking `Countdown`, the 60s auction scheduler, live
  price/bid-count mutation).
- **Scope: one well-covered path per capability area, not a re-run of every unit-tested
  validation message.** Field-level validation text is already asserted in
  `login-form.test.tsx`/`register-form.test.tsx`/etc.; the E2E suite's job is the integration
  seam — a real login persisting a real cookie that a real second page navigation honors, a real
  bid updating a real second browser's screen, a real photo upload landing in a real auction. Each
  spec file below covers its capability's primary flow plus the 1–2 edge cases that only make
  sense end-to-end (e.g., the concurrent-bid race, the anonymous-vs-authenticated grid).
- **No CI wiring in this spec.** `npm run e2e` (new root script) runs the suite locally; adding a
  CI job is a natural follow-up but is out of scope here, so a slow/flaky first run doesn't block
  the existing `verify` pipeline.

## Files

Docs first, per SDD: `docs/010-e2e-tests/{spec.md, plan.md, tasks.md}`.

- **`e2e/playwright.config.ts`** (new) — `testDir: './tests'`, `use.baseURL` from `E2E_BASE_URL`
  (default `http://localhost:3000`), `webServer: { command: 'npm run e2e:server', url: '<baseURL>/health', reuseExistingServer: !process.env.CI }`,
  chromium project only for now, plus the `setup` project (`auth.setup.ts`) that the others
  `dependencies: ['setup']` on.
- **`e2e/tsconfig.json`** (new) — standalone, not part of any workspace's `tsconfig.build.json`.
- **`apps/api/scripts/seed-e2e.ts`** (new, dev/test tooling — not spec-gated per AGENTS.md's own
  carve-out for scripts like `seed.ts`) — deterministic users/auctions as described above.
- **`apps/api/package.json`** — add `"seed:e2e": "tsx scripts/seed-e2e.ts"`.
- **root `package.json`** — add `"e2e:server": "npm run build:shared && npm run build --workspace=apps/web && npm run seed:e2e --workspace=apps/api && npm run start --workspace=apps/api"`,
  `"e2e": "playwright test --config=e2e/playwright.config.ts"`, `"e2e:install": "playwright install --with-deps chromium"`;
  add `@playwright/test` as a root devDependency.
- **root `.env.example`** (new — none exists today) — documents `E2E_BASE_URL` (and notes
  `apps/api/.env` still needs its own `JWT_SECRET`/`PORT` for the server the suite starts).
- **`e2e/tests/auth.setup.ts`** (new) — logs in `seller` and `bidder`, saves `storageState`.
- **`e2e/tests/auth.spec.ts`** — register a brand-new user through the UI, log in, log out
  (via the shell's logout button), invalid-login error path.
- **`e2e/tests/browse-and-search.spec.ts`** — anonymous visitor sees the grid and can search/
  filter/sort with no session; a logged-in visitor's city filter defaults to their profile city.
- **`e2e/tests/create-and-publish-auction.spec.ts`** (uses `seller` storageState) — full wizard
  (photos → details → pricing → schedule → review), "publish now" from the detail page,
  draft appears under "My auctions".
- **`e2e/tests/bidding.spec.ts`** (uses `bidder` storageState, plus a second `seller`-context page
  for the reject-own-auction case) — place a valid bid, reject a bid below the minimum, reject the
  seller bidding on their own listing, two sequential bids extend/reset the window.
- **`e2e/tests/realtime.spec.ts`** — the two-context live-update scenario described above.
- **`e2e/tests/my-bids-and-purchases.spec.ts`** (uses `bidder` storageState against the seeded
  `sold` auction) — "My bids" shows the right status badge, "Purchases" lists the won auction with
  its handover info.
- **`e2e/tests/notifications-and-profile.spec.ts`** (uses `seller`/`bidder` storageState) —
  bell badge appears after an outbid/won/bid-on-my-listing event, notification preferences toggle
  and persist, profile field edits save.

## Verification

- `npm run e2e:install` once, then `npm run e2e` — all specs green against the local production
  build (`E2E_BASE_URL` unset, defaults to `http://localhost:3000`).
- `npx playwright show-report` after a run opens the HTML report with traces/screenshots per
  test — this is the "show off the system's capabilities" artifact the user asked for, no extra
  code needed.
- Manually repoint at a already-running instance: `E2E_BASE_URL=https://staging.example.com npm run e2e`
  (Playwright's `reuseExistingServer` plus a set `E2E_BASE_URL` means `webServer` is skipped
  entirely when `CI` isn't set and something is already answering at that URL — confirm this by
  starting `apps/api`+built `apps/web` manually once and re-running `npm run e2e` to see the
  "reusing existing server" log line instead of a fresh build/seed/start cycle).
- Confirm isolation: run `npm run e2e` twice in a row without manually clearing `apps/api/data/` —
  the second run's `seed:e2e` clears and reseeds automatically, so both runs pass identically.
