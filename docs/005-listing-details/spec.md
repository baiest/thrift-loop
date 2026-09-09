# 005 — Description, condition taxonomy, home-as-auctions, category preference, location

## Problem

Comparing the app against the original product brief surfaced five gaps: no description field on
auctions, a condition taxonomy that doesn't match the brief's four values, a home page that
doesn't show the auctions grid, no category preference on the user, and no explicit per-auction
location (only a display-only join to the seller's city).

## Goals

- Auctions have a `description` (up to 500 characters, multi-line, same whitelist validation as
  `title`).
- Item condition is exactly: Good, New with tag, Unused, Worn (matching _Bueno, Nuevo con
  etiqueta, Sin usar, Con desgaste_).
- The home route (`/`) shows the public auctions grid with its filter bar, not a static welcome
  screen.
- A user can optionally set a category preference at registration and change it later from their
  profile.
- Auctions have a real `location` field, defaulting to the seller's own city, editable at
  creation, and usable as a native filter (no join required to filter or display it).

- A seller can publish a draft auction immediately from its detail page, instead of only via a
  future `publishAt` date and the background scheduler.
- A seller can see all of their own auctions, drafts included, from a dedicated page — not just
  the ones that already made it to the public grid.

## Non-goals

- Using the category preference to pre-filter or sort the grid — only captured, not applied yet.
- Pagination, full-text search ranking — unchanged from spec 004.
- Any change to the bidding rules, lock, or scheduler.

## Acceptance criteria

### Description

- [ ] `POST /api/auctions` requires a non-empty `description` up to 500 characters, same
      whitelist as `title`; anything else is a 400 field error.
- [ ] `PATCH /api/auctions/:id` (draft only) can update `description` under the same validation.
- [ ] Legacy auctions without a `description` load with an empty one instead of breaking.
- [ ] The create-auction form and the auction detail page show the description.

### Condition

- [ ] `ITEM_CONDITIONS` is exactly `good`, `new-with-tag`, `unused`, `worn`.
- [ ] Legacy auctions with an old condition value (`new`, `like-new`, `fair`) load normalized to
      the closest new value instead of breaking.

### Home page

- [ ] `/` renders the public auctions grid (search, filters, results) without requiring login.
- [ ] The old "Welcome" screen and its Log out button are gone from `/`; Log out is reachable from
      the profile page instead.

### Category preference

- [ ] Registration accepts an optional category preference; omitting it registers successfully
      with a `null` preference.
- [ ] An invalid (non-existent) category value is rejected with a 400 field error.
- [ ] The profile page can set/change the preference after registration.

### Location

- [ ] `POST /api/auctions` requires a valid Colombian city as `location`; an invalid value is a
      400 field error.
- [ ] The create-auction form pre-fills `location` with the seller's own profile city, and the
      seller can change it before submitting.
- [ ] `GET /api/auctions?city=<value>` filters by `location` directly (no per-result lookup).
- [ ] Legacy auctions without a `location` load with an empty one instead of breaking.

### Publish now

- [ ] Creating an auction navigates the seller to its own detail page (not the public grid, since
      a fresh draft doesn't show there).
- [ ] The auction detail page shows a "Publish now" button only to the owner, only while the
      auction is `draft`.
- [ ] Clicking it calls `PATCH /api/auctions/:id` with `{ status: 'published' }` (the existing
      endpoint — no new backend work) and refreshes the page, after which the button is gone and
      the auction is visible on the public grid.

### My auctions

- [ ] `/auctions/mine` lists every auction owned by the current viewer, any status (draft,
      published, sold), using the existing `fetchMyAuctions`/`GET /api/auctions/mine` endpoint
      (already implemented, previously unused by the frontend).
- [ ] Draft auctions show a "Draft" badge on their card, same treatment as the existing "Sold"
      badge.
- [ ] The sidebar has a "My auctions" link to this page; anonymous visitors are redirected to
      `/login`, matching every other authenticated page.

## Risks

- The condition and location legacy remaps are best-effort, applied at read time with no
  migration script — same approach already used for spec 003/004's legacy fields.
