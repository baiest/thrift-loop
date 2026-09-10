# 012 — Plan

Root causes confirmed by code inspection for all 16 items. Each is an independent
fix; order below groups related files to minimize context-switching. TDD: failing
test first for each item where a test is feasible (most are), then fix.

## 1. Bid control hidden when logged out

`apps/web/src/pages/auction-detail-page.tsx` — `canBid` currently gates whether
`<BidForm>` mounts at all. Always render `BidForm`; when `user === null`, its submit
handler navigates to `/login` instead of calling `placeBid`. Test:
`auction-detail-page.test.tsx` — logged-out render shows the bid control; clicking
it/submitting navigates to `/login`.

## 2. Validation clears only on blur

Add live re-validation in `updateField`/`handleChange` (not just `handleBlur`) in
`register-form.tsx`, `login-form.tsx` (if applicable), and
`create-auction-wizard.tsx`: after updating `values`, if the field currently has an
error and the new value now passes its validator, clear that field's error
immediately. Don't force validation on every keystroke for untouched fields (keep
existing "validate on blur first" gating) — only actively clear an existing error.
Tests: existing form test files get a case — "typing a valid value clears the
error without blur."

## 3. Notification toggle mobile layout

`apps/web/src/components/atoms/toggle.tsx` + its usage row in `profile-page.tsx`.
Reproduce at a mobile viewport (375px) via component test / Playwright screenshot,
fix wrapping/sizing (`flex-wrap`, label truncation, consistent row height). Test:
`toggle.test.tsx` / `profile-page.test.tsx` snapshot-style class assertions, plus a
visual check via the browser at 375px width.

## 4. Countdown flicker

`apps/web/src/components/molecules/countdown.tsx` (own `setInterval`) vs
`apps/web/src/lib/format.ts`'s `formatTimeLeft` used independently by
`auction-card.tsx`. Two independent tickers computing the same thing off slightly
different clocks is the likely flicker source when a card re-renders. Consolidate:
`AuctionCard` should use `Countdown`'s formatting logic (or a single shared
`useCountdown` hook) instead of computing `formatTimeLeft` separately. Test:
`countdown.test.tsx` gets a case asserting stable output when re-rendered twice
within the same second; `auction-card.test.tsx` asserts it renders via the shared
formatter.

## 5. Mobile search bar / filter button cramped

`apps/web/src/components/organisms/auction-filters.tsx` +
`filter-panel.tsx`'s toggle button. Give the filter button a `shrink-0` fixed
icon-only size on narrow viewports (or stack search full-width with filter button
below/beside at fixed small width). Verify visually in browser at 375px.

## 6. Filter price input not currency-formatted

Swap `TextInput type="number"` for the existing `CurrencyInput` (used already in
`bid-form.tsx`/`PricingStep`) in `filter-panel.tsx`'s min/max price fields. Update
`filter-panel.test.tsx` to assert formatted display (thousands separators).

## 7. "My bids" missing from mobile nav

`apps/web/src/components/organisms/sidebar-nav.tsx` — add a `My bids` entry to
`MOBILE_TAB_ITEMS` matching desktop `NAV_ITEMS`. Test: `sidebar-nav.test.tsx` new
case asserting the mobile tab bar renders a "My bids" link.

## 8. Bid input can't clear/zero

`apps/web/src/components/molecules/currency-input.tsx` — `handleChange` currently
no-ops when `digits === ''`. Fix: call `onChange('')` when the field is cleared, and
let the number-input's own required/min validation (already present in `BidForm`)
handle the empty/zero case at submit time rather than silently blocking the
keystroke. Test: `currency-input.test.tsx` — clearing the input calls `onChange`
with an empty value; typing new digits after clearing produces the new value (not
prefixed by the old one).

## 9. Bids not updating in real time

Investigate `apps/web/src/lib/realtime-client.ts`'s message handler for
`bid-placed` and how it populates `realtime-store.ts`'s `auctionUpdates`, and
whether `auction-detail-page.tsx`'s current-price display actually reads
`auctionUpdates[auctionId]` or only its own `load()`-fetched state. Root cause is
likely one of: (a) the detail page never subscribes `useAuctionRealtime` for the
current-price display, only the grid does; (b) the store update doesn't shape data
the detail page expects. Fix by wiring the detail page's price/bid-count display to
`useAuctionRealtime`'s live value the same way `AuctionCard` does. Test: extend
`realtime.spec.ts` (Playwright, spec 010) with an assertion that a second browser's
_detail page_ (not just grid) updates without reload — this is inherently an
integration bug, so an E2E test is the right level; add a Vitest unit test for the
store/hook wiring too.

## 10. Notifications invisible on mobile

`sidebar-nav.tsx` — `NotificationBell` is only rendered in `DesktopUserBlock`/
`TabletRail`, never in `MobileTabBar`. Add a notification entry point to the mobile
tab bar (bell icon opening the same panel, possibly replacing/next to profile).
Test: `sidebar-nav.test.tsx` — mobile tab bar includes a notification bell/link.

## 11. Photo thumbnail buttons overlap on mobile

`apps/web/src/components/molecules/photo-dropzone.tsx` — reduce simultaneous
absolutely-positioned controls per thumbnail on narrow grids: e.g. move "Cover"
badge and "Remove"/"Move" into a single bottom overlay bar instead of 3 separate
corners, or switch to `grid-cols-2` below a breakpoint so tiles are bigger. Test:
`photo-dropzone.test.tsx` — assert no two interactive controls share the same
corner position class at once (or a simpler structural assertion after the
refactor).

## 12. Missing character-count hint

Add an optional `maxLength` + counter render to
`apps/web/src/components/atoms/text-input.tsx` and `textarea.tsx` (e.g. "42/500"
below the field, styled like existing helper text). Wire `MAX_TITLE_LENGTH`/
`MAX_DESCRIPTION_LENGTH` (from `@thrift-loop/shared`) into `create-auction-wizard.tsx`'s
title/description fields. Test: `text-input.test.tsx`/`textarea.test.tsx` new case
asserting the counter renders and updates with input.

## 13. Duplicate auctions on retry

`apps/web/src/components/organisms/create-auction-wizard.tsx`'s `handleSubmit` —
persist the created `auction.id` in local state as soon as `createAuction` succeeds,
_before_ attempting the photo upload; on retry (user clicks submit again after a
photo-upload failure), skip `createAuction` and go straight to
`uploadAuctionPhotos` using the stored id. Also disable the submit button while
`submitting` is true (confirm this already covers the double-click case) — the real
gap is the failure-then-retry path, not double-click. Test:
`create-auction-wizard.test.tsx` — simulate `createAuction` succeeding then
`uploadAuctionPhotos` failing, retry, assert `createAuction` (mock) was called only
once total across both attempts.

## 14. Can't delete an auction

Backend route + API client function already exist
(`auction.routes.ts` DELETE, `api-client.ts`'s `deleteAuction`). Add a delete
button/action to `apps/web/src/pages/my-auctions-page.tsx` (draft/unsold auctions
only, per spec's acceptance criterion), with a confirmation step before the
irreversible call. Test: `my-auctions-page.test.tsx` — delete button calls
`deleteAuction` and removes the item from the list on success.

## 15. Status pills overflow on mobile

`apps/web/src/components/molecules/auction-card.tsx`'s `StatusBadges` container —
add `flex-wrap` (and `gap-y` spacing) so badges wrap instead of overflowing. Test:
`auction-card.test.tsx` — assert wrapper has `flex-wrap` class present (or a
structural check if class-based assertions aren't the existing test style there —
match whatever pattern nearby tests use).

## 16. Filters don't persist

`apps/web/src/pages/auctions-page.tsx` — filter state is local-only. Move it into
URL search params via `useSearchParams` (React Router, already a dependency) so a
reload preserves the current filters, and dropping a filter (e.g. removing city)
updates the URL immediately so a reload doesn't resurrect it. Keep the existing
"default city from profile" behavior but only apply it when there's no `city` param
in the URL at all (not merely when it's been cleared by the user — need a way to
distinguish "never set" from "explicitly cleared"; simplest: only auto-default city
on the very first mount before any user interaction, tracked by the existing
`cityDefaulted` ref, and once the URL has been touched by the user, never
re-apply the default). Test: `auctions-page.test.tsx` — clearing a filter and
simulating remount with the resulting URL does not restore the default city.

## Verification

- `npm run test` / `npm run test:cov` (85% gate) across `apps/web` and `apps/api`
  after each item, not just at the end.
- `npm run e2e` full Playwright run at the end (items 1, 9, 13 touch flows already
  covered by spec 010's suite — expect to update `realtime.spec.ts` and possibly
  `create-and-publish-auction.spec.ts`).
- Manual mobile-viewport check (Chrome DevTools device toolbar or the LAN URL on an
  actual phone) for items 3, 5, 7, 10, 11, 15 — these are visual/layout bugs unit
  tests can only partially cover.
- Re-check `apps/api/data/logs/app.jsonl` after manually testing bid clearing (#8)
  and auction creation retry (#13) to confirm no more spurious
  `bid_rejected`/duplicate `auction_created` events under the same repro steps used
  to originally find them.

## Order of implementation

Group by file to avoid re-opening the same files repeatedly:

1. `sidebar-nav.tsx` → items 7, 10
2. `currency-input.tsx` → items 6 (filter-panel usage), 8
3. `auction-card.tsx` → items 4 (partial), 15
4. `countdown.tsx` / `format.ts` → item 4
5. Forms (`register-form.tsx`, `create-auction-wizard.tsx`) → item 2
6. `text-input.tsx` / `textarea.tsx` → item 12
7. `create-auction-wizard.tsx` → items 12 (wiring), 13
8. `photo-dropzone.tsx` → item 11
9. `auction-filters.tsx` / `filter-panel.tsx` → items 5, 6
10. `auctions-page.tsx` → item 16
11. `my-auctions-page.tsx` → item 14
12. `auction-detail-page.tsx` / realtime hooks → items 1, 9
13. `toggle.tsx` / `profile-page.tsx` → item 3
