# 006 — UX/UI revamp: responsive shell, branding, auctions browsing, creation wizard

## Problem

The app was built mobile-first and the desktop experience is broken: the shell is a single
off-canvas drawer with a hamburger button at every breakpoint, so on a wide screen the left menu
stays collapsed even though there is room to show it expanded. The sidebar has no icons and no
indication of which route is active. The signed-in user's name and the log out action are not in
the shell at all — log out is buried at the bottom of the profile page. Loading states render
either nothing (`null`) or the literal string `Loading auctions…`. On the auctions page, five
filter controls sit in a `grid-cols-5` next to the search box, so search has no visual priority
and the filters clutter the page even when unused. The auction card omits the auction's start
date and time remaining even though both already exist on the model. Creating an auction is one
long form with a raw `<input type="number">` for price and a raw `datetime-local` input for the
publish date, with no visual indication of which dates/times are actually selectable. The
profile page only shows and edits two fields (address, category preference) — not the user's own
name or city. Finally, the brand color is Tailwind's `emerald-*` applied ad hoc per component
(no shared token), and green does not read as secondhand fashion.

## Goals

- The app shell (`app-layout.tsx`, `sidebar-nav.tsx`) is responsive by breakpoint: an always-
  expanded 256px sidebar with icons and labels at desktop widths, an icon-only rail at tablet
  widths, and the existing drawer only below that.
- The active nav route is visually highlighted.
- Nav items have icons.
- The signed-in user's name and a visible log out action live in the shell, not only on the
  profile page.
- A shared color/typography token layer replaces the hardcoded `emerald-*` classes with a
  terracotta-led palette suited to secondhand fashion; no component references `emerald-*`
  afterwards.
- No page renders the literal string "Loading..." (or "Loading auctions…"); loading states use
  skeleton placeholders shaped like the content they replace.
- On the auctions page, search is the dominant control; the other filters are collapsed behind a
  single "Filters" toggle and shown as removable chips once applied.
- The auction card shows the condition as a pill, current price, time remaining until `bidEndsAt`,
  and the auction's start date. (The reference design also shows a size pill, but `PublicAuction`
  has no `size` field and adding one is a data migration — explicitly a non-goal here.)
- Creating an auction is a multi-step wizard (photos, details, pricing, schedule, review) instead
  of one long form.
- The photo step supports drag-and-drop upload with reorderable previews and a marked cover
  photo.
- The price step shows the typed amount live-formatted as Colombian peso currency.
- The schedule step's date/time picker visibly disables dates and hours that cannot be selected,
  instead of only rejecting them on submit.
- The profile page shows the user's first name, last name, city, and country, and lets the user
  edit first name, last name, and city in addition to the existing address and category
  preference fields.

## Non-goals

- Auction detail page, "My auctions" page beyond inheriting the shared shell/card, notifications,
  and password change are unchanged by this spec.
- No new user-model fields (phone, bio, avatar image) — anything requiring a data migration is
  out of scope.
- No change to bidding rules, the bid window duration, or the publish scheduler.
- No third-party UI/component library or form-validation library is introduced; validation stays
  hand-written using the existing shared predicates.
- No change to how photos are uploaded to the server (still `POST /api/auctions/:id/photos`
  after auction creation) — only the client-side selection UX changes.

## Acceptance criteria

### Design tokens & branding

- [ ] A `@theme` block in `apps/web/src/index.css` defines the brand color scale (terracotta
      primary, espresso ink, cream surface, linen muted, hairline border) and the two brand fonts;
      no component defines its own one-off hex color for brand purposes.
- [ ] `grep -r emerald apps/web/src` returns no matches.
- [ ] `grep -rE '(gray|slate|zinc|stone)-[0-9]' apps/web/src` returns no matches: neutral text and
      surfaces come from the warm token scale, not Tailwind's cool default greys.
- [ ] `Badge` supports distinct tones for condition, live, ended, draft, and "own listing" status,
      each visually distinguishable from the others.

### Shell & sidebar

- [ ] At desktop width, the sidebar renders expanded (icon + label per item) with no hamburger
      button visible, and the main content is offset to avoid overlapping it.
- [ ] At the width used today (below `lg`), the existing drawer/hamburger behavior still works.
- [ ] The nav item matching the current route is visually distinguished (e.g. `aria-current` plus
      a highlighted background) from the other items.
- [ ] Every nav item renders an icon next to its label at desktop width.
- [ ] The signed-in user's display name is visible in the shell (not only after navigating to
      Profile).
- [ ] The desktop sidebar and tablet rail show a brand block ("Thrift Loop", plus a "Secondhand
      Fashion" subtitle at desktop width only) above the nav items.
- [ ] A "Log out" control is visible in the shell and calls the same logout flow previously wired
      only on the profile page; the profile page no longer needs its own logout button (the
      profile page may keep or drop it, but the shell has one either way).

### Loading states

- [ ] `AuctionGrid`'s loading state renders skeleton cards, not the text "Loading auctions…" (the
      updated test asserts the absence of that string and the presence of skeleton placeholders).
- [ ] Profile page, My auctions page, and auction detail page render a skeleton (not `null` or a
      blank screen) while their initial data is loading.

### Auctions browsing

- [ ] The auctions page header shows a one-line subtitle under the "Auctions" heading and a
      "Create auction" call-to-action at desktop width (the equivalent action already exists as a
      sidebar/tab-bar nav item, so the header CTA is hidden below `sm`).
- [ ] Below the filters, a results bar shows the item count ("N items available to bid", singular
      for one) and a sort control with options Ending soon, Newest, Price low to high, Price high
      to low; the default is Newest so today's ordering is unchanged unless the user picks a sort.
      Sort is not a filter: it is excluded from the filter count badge and from the filter chips.
- [ ] The search input is full-width and visually the largest control on the page; category,
      city, and min/max price controls are not visible by default.
- [ ] A "Filters" control opens/closes the collapsed filter controls and shows a count of
      currently-applied filters.
- [ ] Each applied filter (including the city pre-filled from the user's profile) appears as a
      removable chip below the search bar; removing a chip clears that filter.
- [ ] Existing filtering behavior (debounce, server query params) is unchanged: filters still
      narrow results via `search`, `category`, `city`, `minPriceCOP`, `maxPriceCOP`.
- [ ] Each auction card shows: condition pill, price (current bid if present, else starting
      price), time remaining until `bidEndsAt` (or "Ended" once past), and the auction's start
      date.
- [ ] An auction with less than one hour of bidding remaining is visually marked as urgent,
      distinct from auctions with more time left.

### Create-auction wizard

- [ ] Creating an auction is presented as sequential steps (photos, details, pricing, schedule,
      review) with visible progress and Back/Continue controls, instead of one scrollable form.
- [ ] Continue on a given step is blocked while that step's own required fields are invalid, and
      is not blocked by incomplete fields belonging to a different step.
- [ ] Photos can be added via drag-and-drop in addition to the existing file picker; the existing
      client-side filters (allowed MIME types, 5 MB limit, 10-photo max) still apply.
- [ ] Uploaded photos are shown as reorderable previews; the first photo is marked as the cover;
      each photo can be individually removed.
- [ ] The price field displays the value formatted as Colombian pesos (e.g. typing `120000` shows
      `$120.000`) while the underlying submitted value remains a plain integer validated by the
      existing `isValidCopPrice`.
- [ ] The publish-date/time picker visibly disables dates and hours that are not selectable (past
      dates at minimum); attempting to submit a disabled value is prevented client-side, and the
      server still rejects an invalid `publishAt` if it somehow arrives.
- [ ] A server-side field error for any wizard field returns the user to the step containing that
      field, with the error shown on it.
- [ ] The review step summarizes all entered data with a link back to each step, and submitting
      from review performs the same auction-creation request as before (unchanged API contract).

### Profile

- [ ] The profile page displays the user's first name, last name, city, and country as read
      values (previously not shown at all).
- [ ] The profile page allows editing first name, last name, and city, in addition to the
      existing address and category preference fields; country remains fixed.
- [ ] `PATCH /api/auctions/me` — i.e. `PATCH /api/auth/me` — accepts `firstName`, `lastName`, and
      `city` alongside the existing editable fields, validated with the same predicates used
      elsewhere (e.g. `isColombiaCity` for city); an invalid value for any of them is a 400 field
      error.
- [ ] Saving shows an "unsaved changes" state before submit and a success confirmation after.

## Open questions

- None blocking approval; adding profile fields not present on the user model today (phone, bio,
  avatar) is explicitly deferred (see Non-goals) rather than an open question.
