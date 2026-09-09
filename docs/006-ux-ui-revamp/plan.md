# 006 — Plan

## Approach

No new libraries (no component kit, no icon package, no date-picker package, no form library) —
same constraint spec 005 worked under. Everything is built from the existing atomic layers
(`atoms` → `molecules` → `organisms`) plus one new tier of small, focused molecules for the
wizard's custom inputs. The riskiest structural change is splitting `CreateAuctionForm` into a
step-driven wizard; everything else (tokens, sidebar, skeletons, card, filters, profile fields)
is additive and independently shippable, so the six phases below are ordered to de-risk that
split last, after its building blocks (`Stepper`, `CurrencyInput`, `PhotoDropzone`,
`DateTimePicker`) already exist and are tested standalone.

Tailwind v4 has no `tailwind.config.js` in this repo — `apps/web/src/index.css` is just
`@import 'tailwindcss';`. Brand tokens are added as a `@theme` block in that same file, which is
how v4 project-scopes custom colors/fonts into utility classes (e.g. `bg-brand`, `font-display`)
without a config file or a new build dependency.

## Key decisions

- **Tokens via `@theme`, not a new config file.** Keeps the single-file Tailwind v4 setup intact;
  every component keeps using utility classes, just renamed (`emerald-600` → `brand`,
  `emerald-50` → `brand-tint`, etc.).
- **Icons as inline SVG paths in a new `Icon` atom**, not an icon package. `sidebar-nav.tsx`
  already hand-rolls its hamburger SVG this way — `Icon` generalizes that pattern behind a
  `name` prop backed by a fixed lookup object, so no new dependency and no risk of an icon font
  flash.
- **Sidebar active state via `NavLink`**, replacing `Link`. `react-router-dom` v7's `NavLink`
  exposes `isActive` through its children/className render prop — no manual `useLocation`
  matching to maintain.
- **Responsive sidebar is CSS-only (Tailwind breakpoints), no new state.** The existing
  `isOpen` state and drawer markup are kept for `<lg`; `lg:` and `md:` variants add
  always-visible rail/full versions on top, matching how `auction-grid.tsx` already switches
  columns per breakpoint with pure Tailwind classes.
- **Logout moves into `SidebarNav` via a new `useLogout` hook**, extracted from
  `profile-page.tsx`'s existing `handleLogout` (calls `logout()`, `clearUser()`, then
  `navigate('/login')`) so both places share one implementation instead of copy-pasting it.
- **Loading skeletons are plain `div`s with a shimmer utility class**, not a library — `Skeleton`
  is one atom (`width`/`height`/`className` props), and `AuctionCardSkeleton` arranges several of
  them to match `AuctionCard`'s real layout, the same "placeholder mirrors the real component"
  idiom already used for `PhotoPlaceholder` in `auction-card.tsx`.
- **`formatTimeLeft` is a pure function taking `now` as a parameter**, not reading `Date.now()`
  internally, so its tests are deterministic (same idiom the codebase already uses for the bid
  window: `packages/shared/src/bid.ts`'s `BID_WINDOW_MS` math is pure and time-parameterized).
  It lives in `apps/web/src/lib/format.ts` next to the existing `formatCOP`.
- **Filters collapse behind one toggle; the underlying `AuctionFilters` value shape and the
  debounce/query-building in `auctions-page.tsx` do not change** — only presentation. This keeps
  the spec 004 filtering contract (`search`, `category`, `city`, `minPriceCOP`, `maxPriceCOP`)
  untouched.
- **`CreateAuctionForm` splits into a `WIZARD_STEPS` config plus one component per step**, rather
  than one component with conditional rendering. `WIZARD_STEPS` maps each step to the subset of
  `REQUIRED_FIELD_VALIDATORS` keys it owns; validating "just this step" is `validateFields(values,
WIZARD_STEPS[currentStep].fields)` reusing the existing per-field validator functions verbatim.
  A server field error's key is looked up against `WIZARD_STEPS` to know which step to jump back
  to.
- **`PhotoDropzone` replaces `PhotoUploader` in place** (same `files`/`onChange` contract) rather
  than living alongside it, so `create-auction-wizard.tsx` has one obvious photo input. It keeps
  `PhotoUploader`'s validation (`isAllowedPhotoMimeType`, `MAX_PHOTO_SIZE_BYTES`,
  `MAX_PHOTOS_PER_AUCTION`) and object-URL preview/cleanup logic, adding `onDragOver`/`onDrop`
  handlers that funnel into the same `handleFileInput`-equivalent path, plus reordering (swap
  indices on drag) and a "Cover" label on index 0.
- **`CurrencyInput` stores the raw digit string as its value** (same as today's
  `priceCOP: string` in `FormValues`/`CreateAuctionPayload` — no payload shape change) and derives
  the displayed formatted string from it on render via `formatCOP`; validation still runs
  `isValidCopPrice` on the parsed integer, unchanged.
- **`DateTimePicker` derives disabled dates/hours from one pure predicate** (e.g.
  `isSelectableSlot(date, now)`) used by both the calendar's `disabled` rendering and the new
  `publishAt` validator, so the UI can never show a slot as pickable that validation would then
  reject.
- **Profile field expansion touches three layers minimally**: `UPDATE_PROFILE_FIELDS` in
  `auth.routes.ts` gains `firstName`, `lastName`, `city`; `UpdateProfileInput` and
  `buildProfilePatch` in `auth.service.ts` gain matching optional fields with the same
  trim/validate/patch idiom already used for `address`; `PublicUser` needs no change since
  `firstName`/`lastName`/`city` already exist on it — only their mutability changes.

## Data model

No changes to `packages/shared` types (`PublicAuction`, `PublicUser`) — every field this spec
surfaces or edits (`publishAt`, `bidEndsAt`, `location`, `firstName`, `lastName`, `city`) already
exists. No changes to `apps/api` models or repositories.

## API contract

- `PATCH /api/auth/me` — `UPDATE_PROFILE_FIELDS` becomes `['firstName', 'lastName', 'city',
'address', 'categoryPreference']`. `firstName`/`lastName` follow the same "required, non-empty
  after trim" rule `registerUser` already applies; `city` is validated with `isColombiaCity`
  (already imported in `auth.service.ts`). Invalid values are 400 field errors, same shape as
  today.
- `POST /api/auctions` — no contract change. The wizard still submits the same
  `CreateAuctionPayload` shape in one call at the Review step, and `publishAt` gains a real
  client-side validator, but the field was already accepted (just unvalidated) server-side per
  `auction.service.ts`'s existing handling — confirm during implementation whether the server
  already rejects an invalid `publishAt` and add that check there too if it does not, so client
  and server agree.
- No other endpoint changes.

## Affected areas

- `apps/web/src/index.css` — `@theme` token block, font imports.
- `apps/web/src/components/atoms/{icon.tsx (new), badge.tsx, button.tsx, text-input.tsx,
select.tsx, textarea.tsx, skeleton.tsx (new)}` (+ tests).
- `apps/web/src/components/molecules/{auction-card.tsx, auction-card-skeleton.tsx (new),
search-field.tsx (new), filter-panel.tsx (new), filter-chips.tsx (new), stepper.tsx (new),
photo-dropzone.tsx (new, replaces photo-uploader.tsx), currency-input.tsx (new),
date-time-picker.tsx (new)}` (+ tests).
- `apps/web/src/components/organisms/{sidebar-nav.tsx, auction-filters.tsx, auction-grid.tsx,
create-auction-form.tsx (replaced by create-auction-wizard.tsx)}` (+ tests).
- `apps/web/src/pages/{app-layout.tsx, auctions-page.tsx, create-auction-page.tsx,
profile-page.tsx, my-auctions-page.tsx, auction-detail-page.tsx, login-page.tsx,
register-page.tsx}` (+ tests).
- `apps/web/src/lib/{format.ts, date-slots.ts (new)}` (+ tests).
- `apps/web/src/hooks/{use-logout.ts (new), use-now.ts (new)}` (+ tests).
- `apps/api/src/routes/auth.routes.ts` (+ tests).
- `apps/api/src/services/auth.service.ts` (+ tests).

## Risks

- **Coverage gate (85.01%) on many small new files.** Each new molecule/hook ships its own test
  in the same commit as the implementation (TDD red-first), same discipline as spec 005's
  `textarea.tsx`.
- **`AuctionGrid`'s existing test asserts the literal "Loading auctions…" string.** That test is
  rewritten first (red) to assert skeletons instead, before the implementation changes, so the
  suite is never green on the old behavior and red on the new one simultaneously.
- **Splitting `CreateAuctionForm` risks silently dropping validation coverage** for a field during
  the refactor. Mitigated by keeping every existing validator function and the
  `REQUIRED_FIELD_VALIDATORS` map as the single source of truth — `WIZARD_STEPS` only groups
  existing keys, it does not re-implement validation.
- **Introducing a `publishAt` validator changes behavior for a field that is optional today.**
  Keep "no value" (empty string) valid — only a _present_ value must be a selectable slot — so
  existing auctions created without a publish date are unaffected.
- **Sidebar breakpoint CSS regressions are easy to miss visually.** Tests assert structure
  (element presence/`aria-current`/no hamburger button at a given rendered state) rather than
  computed pixel widths, and a manual pass at 1440/1024/768/390px closes the gap per the spec's
  acceptance criteria.

## Test strategy (TDD)

- `apps/web/src/lib`: `format.test.ts` extended with `formatTimeLeft` cases (multi-hour, minutes-
  only, under-1-hour urgency flag, exactly at `bidEndsAt`, past `bidEndsAt` → "Ended");
  `date-slots.test.ts` (new) for the shared selectable-slot predicate (past date, past hour today,
  valid future hour).
- `apps/web/src/hooks`: `use-logout.test.ts` (calls `logout`, clears store, navigates),
  `use-now.test.ts` (updates on a fake timer, clears interval on unmount).
- `apps/web/src/components/atoms`: `icon.test.tsx` (renders a known name, throws/falls back for
  an unknown one — decide behavior in the red test first), `skeleton.test.tsx`, extended
  `badge.test.tsx` for the new tones, extended `button`/`text-input`/`select`/`textarea` tests
  only if their class names are asserted anywhere (grep first).
- `apps/web/src/components/molecules`: `auction-card-skeleton.test.tsx`, `search-field.test.tsx`
  (typing calls `onChange`), `filter-panel.test.tsx` (toggle open/closed, renders existing filter
  controls), `filter-chips.test.tsx` (renders one chip per active filter, removing one clears
  just that field), `stepper.test.tsx` (marks the current/completed/upcoming steps), extended
  `auction-card.test.tsx` (shows time-left and start date, urgency styling under the threshold),
  `photo-dropzone.test.tsx` (carries over every `photo-uploader.test.tsx` case plus drop-to-add
  and reorder), `currency-input.test.tsx` (typing digits renders formatted COP, exposes the raw
  value to `onChange`), `date-time-picker.test.tsx` (past date/hour rendered `disabled`, selecting
  an enabled slot fires `onChange`).
- `apps/web/src/components/organisms`: `sidebar-nav.test.tsx` extended (icons present, active
  route has `aria-current`, user name and Log out visible, desktop-width render has no hamburger
  button — assert via the `lg:hidden` class or a viewport-driven test helper already used
  elsewhere in the suite), `auction-filters.test.tsx` reused inside `filter-panel.test.tsx`,
  `auction-grid.test.tsx` rewritten first for skeletons, `create-auction-wizard.test.tsx` (new,
  covers step navigation, per-step validation blocking, server field error routing back to its
  step, final submit payload).
- `apps/web/src/pages`: `app-layout.test.tsx` extended (renders inside a wide-viewport context
  without the hamburger, per whatever helper the sidebar test introduces), `profile-page.test.tsx`
  extended (shows read-only name/city/country, edits firstName/lastName/city, unsaved-changes
  indicator), `my-auctions-page.test.tsx` and `auction-detail-page.test.tsx` extended for
  skeleton-instead-of-null, `create-auction-page.test.tsx` updated for the wizard mount.
- `apps/api/src/services/auth.service.test.ts` extended: updating `firstName`/`lastName`/`city`
  succeeds and validates; empty `firstName`/`lastName` and an invalid `city` are 400 field errors,
  mirroring the existing `address`/`categoryPreference` cases.
- `apps/api/src/routes/auth.routes.test.ts` extended: `PATCH /api/auth/me` accepts the three new
  fields end-to-end (supertest), same pattern as the existing `address` case.
