# 006 — Tasks

## Phase 0 — Design tokens & branding

- [x] `apps/web/src/index.css`: add `@theme` block (brand terracotta scale, ink, surface, linen,
      hairline, `--font-display`/`--font-sans`), import Playfair Display + Inter
- [x] `components/atoms/badge.tsx`: replace `neutral`/`emerald`/`amber` tones with
      `condition`/`live`/`ended`/`draft`/`own` + tests
- [x] Replace every `emerald-*` class: `atoms/button.tsx`, `atoms/text-input.tsx`,
      `atoms/select.tsx`, `atoms/textarea.tsx`, `organisms/sidebar-nav.tsx`,
      `pages/login-page.tsx`, `pages/register-page.tsx` + update any tests asserting those classes
      (also found: `molecules/bid-history.tsx`, `molecules/password-strength-meter.tsx`,
      `molecules/searchable-select.tsx`, `pages/profile-page.tsx`, `molecules/auction-card.tsx`)
- [x] `grep -r emerald apps/web/src` returns nothing

## Phase 1 — Shell, sidebar, icons

- [x] `components/atoms/icon.tsx` + test: fixed `ICON_PATHS` map (compass, tag, plus-circle,
      user, log-out, search, sliders, x, upload, chevron-left, chevron-right, grip)
- [x] `hooks/use-logout.ts` + test: extract `logout()` + `clearUser()` + navigate('/login') out of
      `profile-page.tsx`
- [x] `sidebar-nav.tsx`: `NavItem` gains `icon`; switch `Link` → `NavLink`; active item gets
      `aria-current`, tinted pill, left bar; add icons to all items + tests
- [x] `sidebar-nav.tsx`: `lg:` always-expanded variant (hamburger/overlay `lg:hidden`), existing
      drawer kept below `lg` + tests for each rendered state (icon-only `md:` rail deferred — see
      note below)
- [x] `sidebar-nav.tsx`: pinned bottom user block (avatar initials, `firstName lastName`, `city`
      from `useAuthStore`) + visible "Log out" row wired to `useLogout` + tests
- [x] `app-layout.tsx`: content wrapper with `lg:ml-64` offset and `mx-auto max-w-7xl px-8`
      container + test
- [x] Remove the per-page `pt-20` workarounds now that the shell handles offset (grep every page
      for `pt-20` and fix) + update affected page tests

Update: closed after an explicit request to match the Stitch designs more closely. `SidebarNav`
was rebuilt as three independent landmarks instead of one CSS-driven drawer: `DesktopSidebar`
(`lg+`, unchanged expanded sidebar + user block + logout), `TabletRail` (`md`–`lg`, icon-only with
tooltips and a logout icon button), and `MobileTabBar` (`<md`, a fixed bottom tab bar with
Auctions/My auctions/Create/Profile — "My purchases" is intentionally off the 4-tab bar, matching
the Stitch mobile screen; still reachable via URL and the desktop/tablet nav). The hamburger
menu/drawer is gone entirely. `app-layout.tsx` offsets updated (`md:ml-[72px]`, `lg:ml-64`,
`pb-20` so content clears the bottom tab bar on mobile).

## Phase 2 — Loading states

- [x] `components/atoms/skeleton.tsx` + test: shimmer block, width/height/className props
- [x] `components/molecules/auction-card-skeleton.tsx` + test: mirrors `AuctionCard` layout
- [x] `organisms/auction-grid.test.tsx`: rewrite first (red) to assert skeletons and the absence
      of "Loading auctions…"
- [x] `organisms/auction-grid.tsx`: render a grid of `AuctionCardSkeleton` while `isLoading`
- [x] `pages/profile-page.tsx`, `pages/my-auctions-page.tsx`, `pages/auction-detail-page.tsx`:
      replace the `null` loading branch with a page-shaped skeleton + tests
- [x] Normalize `Saving…` / `Creating auction...` and any other loading copy to a consistent `…`

## Phase 3 — Auctions: search hero, filters, card

- [x] `lib/format.ts`: `formatTimeLeft(bidEndsAt, now)` + tests (hours+minutes, minutes-only,
      urgency flag under 1h, exactly at end, past end → "Ended")
- [x] `hooks/use-now.ts` + test: ticks every minute, clears interval on unmount
- [x] `components/molecules/search-field.tsx` + test: 56px search input with icon, full width
- [x] `components/molecules/filter-chips.tsx` + test: one removable chip per active filter
      (including the profile-derived default city), "Clear all"
- [x] `components/molecules/filter-panel.tsx` + test: collapsed by default, houses the existing
      category/city/min/max controls from `auction-filters.tsx`, shows active-filter count
- [x] `organisms/auction-filters.tsx`: recompose around `SearchField` + `FilterPanel` +
      `FilterChips`; keep the existing `AuctionFiltersValue` contract and debounce untouched in
      `pages/auctions-page.tsx` + tests
- [x] `molecules/auction-card.tsx`: reorder to photo → pills → title → price/time-left row →
      "Started `<date>` · `<location>`" meta line, using `formatTimeLeft` + `useNow` + tests
      (urgency styling, "Yours"/"Ended"/"Draft" pills using the new badge tones)

## Phase 4 — Create-auction wizard

- [x] `lib/date-slots.ts` + test: `isDateSelectable`/`isHourSelectable` pure predicates (reject
      past dates/hours) — implemented as two focused predicates instead of one combined
      `isSelectableSlot`, one for the calendar grid and one for the hour list
- [x] `components/molecules/stepper.tsx` + test: numbered steps, current/completed/upcoming states
- [x] `components/molecules/currency-input.tsx` + test: typing digits shows live `formatCOP`
      output, `onChange` still receives the raw digit string
- [x] `components/molecules/date-time-picker.tsx` + test: calendar + hour list, past slots
      `disabled` via `isDateSelectable`/`isHourSelectable`, selecting an enabled slot fires
      `onChange` with an ISO string
- [x] `components/molecules/photo-dropzone.tsx` + test: carries over every
      `photo-uploader.test.tsx` case (MIME/size filtering, max count, remove) plus drag-and-drop,
      "Cover" label on the first photo, reordering; deleted `photo-uploader.tsx` once migrated
- [x] `create-auction-form.tsx` → `organisms/create-auction-wizard.tsx`: `WIZARD_STEPS`
      (photos/details/pricing/schedule/review → field keys), reuses the original per-field
      validators, `publishAt` stays optional/unvalidated (its selectability is enforced by the
      picker itself, not a separate validator) + tests: Continue blocked only by the current
      step's own invalid fields, server field errors route back to their owning step, Review
      submits the same payload shape as before. Split into `PhotosStep`/`DetailsStep`/
      `PricingStep`/`ScheduleStep`/`ReviewStep` sub-components to keep cognitive complexity ≤ 10.
- [x] `pages/create-auction-page.tsx`: mount the wizard instead of the old form + test

Update: closed after an explicit request to match the Stitch designs more closely.

- `ScheduleStep` now has the two "Publish now" / "Schedule for later" radio cards from the design;
  the date/time picker only renders once "Schedule for later" is selected, and switching back to
  "Publish now" clears `publishAt`.
- `DateTimePicker` gained month navigation (Previous/Next month chevrons with a "March 2026"
  header), matching the calendar in the Stitch pricing/schedule screen; "Previous month" is
  disabled while viewing the current month.

## Phase 5 — Profile

- [x] `apps/api/src/services/auth.service.ts`: `UpdateProfileInput` gains `firstName?`,
      `lastName?`, `city?`; `buildProfilePatch` validates/trims them like `address` (empty
      first/last name and invalid `city` are field errors) + tests
- [x] `apps/api/src/routes/auth.routes.ts`: `UPDATE_PROFILE_FIELDS` gains `firstName`, `lastName`,
      `city` + route test (supertest) covering the new fields end-to-end
- [x] `pages/profile-page.tsx`: read-only display of country, editable first name/last name/city
      fields alongside existing address/category, "unsaved changes" indicator before save + tests

## Phase 6 — Stitch parity pass

Closed after re-comparing the running app against the Stitch "Auctions Browse" screen and finding
gaps the earlier phases didn't cover: no brand block in the sidebar, no header CTA/subtitle, no
result count or sort control, and leftover cool `gray-*` classes next to the warm token scale.

- [x] `components/organisms/sidebar-nav.tsx` + test: add a `BrandBlock` ("Thrift Loop" +
      "Secondhand Fashion" subtitle) above the nav list in `DesktopSidebar`; `TabletRail` gets the
      name only (no subtitle, to fit the 72px rail)
- [x] `pages/auctions-page.tsx` + test: header row gains a subtitle and a "Create auction" link
      styled as a button, hidden below `sm` (the tab bar already has the same action)
- [x] `packages/shared/src/auction-sort.ts` + test: `AUCTION_SORTS`, `AuctionSort`, `isAuctionSort`,
      `DEFAULT_AUCTION_SORT` ('newest')
- [x] `apps/api/src/repositories/auction.repository.json.ts` + test: `SORT_COMPARATORS` table
      (ending-soon/newest/price-asc/price-desc), null `bidEndsAt` sorts last, tie-break by
      newest-first then `id`; wired into `findAllPublished` only
- [x] `apps/api/src/services/auction.service.ts` + test: `resolveSortFilter` — invalid/absent sort
      falls back to the default, same sanitize-never-reject pattern as the other filters
- [x] `apps/api/src/routes/auction.routes.ts` + test: `sort` added to `SEARCH_FIELDS`/
      `AuctionSearchInput`
- [x] `apps/web/src/lib/api-client.ts` + test: `sort` added to the `AuctionFilters` type and
      query-string serialization
- [x] `components/molecules/sort-control.tsx` + test: labeled `Select` over the 4 sort options
- [x] `components/molecules/results-bar.tsx` + test: item count (singular/plural) + `SortControl`
- [x] `pages/auctions-page.tsx` + test: `sort` added to `Filters`/`EMPTY_FILTERS`, read
      un-debounced (bypasses the 300ms search debounce), `ResultsBar` mounted between filters and
      grid; not counted in `FilterPanel`'s badge or rendered as a `FilterChips` chip
- [x] Warm-token sweep: add `--color-ink-soft`/`--color-ink-faint` to `index.css`; replace
      `gray-*` with token classes across `auction-card.tsx` (incl. `PhotoPlaceholder` →
      `bg-linen`), `sidebar-nav.tsx`, `create-auction-wizard.tsx`, `auction-detail-page.tsx`,
      `badge.tsx` (`neutral`/`ended` tones), and the remaining files the grep below finds
- [x] `grep -rE '(gray|slate|zinc|stone)-[0-9]' apps/web/src` returns nothing

## Wrap-up

- [x] `npm run verify` green (eol, typecheck, lint `--max-warnings=0`, prettier, test:cov ≥
      85.01%, build)
- [x] Manual pass at 1440px, 1024px, 768px, 390px against the Stitch screenshots referenced in
      `spec.md`
- [x] `grep -r emerald apps/web/src` and a check for any remaining user-visible "Loading" string
      both come back empty
- [ ] Open PR, confirm CI is green, leave merge to the user
