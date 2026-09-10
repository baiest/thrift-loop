# 010 — Playwright end-to-end suite

## Problem

Unit and component tests (Vitest + Testing Library) cover `apps/web` and `apps/api` in isolation,
but nothing exercises the real stack together: a real browser, the built frontend, the real API,
the JSON repositories, and the WebSocket channel. Integration-seam bugs have shipped before (the
notification route 404 found only by manual browser testing during spec 008) precisely because
nothing automated crosses that seam.

## Goals

- A Playwright suite covering the platform's shipped capabilities end to end: registration/login,
  anonymous and authenticated browsing/search, listing creation and publishing, bidding (including
  rejection cases), my-bids, purchases, notifications, and live realtime updates across two
  browser contexts.
- Tests drive the production build (API-served single-origin), the same shape real users hit.
- The target URL is a single, simple-to-change environment variable, so the same suite can later
  point at a real/staging deployment instead of local.
- A runnable, visual artifact of what the platform does today (Playwright's HTML report/traces),
  usable as a demonstration.

## Non-goals

- No CI wiring in this spec — `npm run e2e` runs locally; a CI job is a future addition.
- No cross-browser matrix (Chromium only for now).
- No re-testing of field-level validation messages already covered by component tests — E2E
  covers the integration path, not every validation string.
- No mocking of the WebSocket channel — realtime is tested against the real server.

## Acceptance criteria

- [ ] `npm run e2e:install` installs the Chromium browser Playwright needs.
- [ ] `npm run e2e` builds `packages/shared` + `apps/web`, seeds a dedicated deterministic dataset,
      starts `apps/api` serving the built SPA, and runs the suite against
      `E2E_BASE_URL` (default `http://localhost:3000`).
- [ ] A setup project logs in as two seeded users (seller, bidder) once via the real login form and
      saves their sessions (`storageState`) for reuse by the other spec files.
- [ ] Auth: register a new user, log in, log out, invalid-login error.
- [ ] Browsing/search: anonymous visitor sees the grid and can search/filter/sort with no session;
      a logged-in visitor's city filter defaults to their profile city.
- [ ] Listing creation: the full creation wizard (photos → details → pricing → schedule → review),
      publishing a draft, and seeing it under "My auctions".
- [ ] Bidding: a valid bid succeeds; a bid below the minimum is rejected; the seller cannot bid on
      their own auction; a second bid resets the bidding window.
- [ ] Realtime: a bid placed in one browser context is reflected live (no reload) on another
      context's open detail page, grid card, and notification bell.
- [ ] My-bids/purchases: correct status badges and purchase/handover details for a seeded sold
      auction.
- [ ] Notifications/profile: notification preference toggles persist; profile field edits save.
- [ ] Re-running `npm run e2e` twice in a row without manual cleanup passes both times (the seed
      step clears and reseeds automatically).

## Open questions

- None blocking approval.
