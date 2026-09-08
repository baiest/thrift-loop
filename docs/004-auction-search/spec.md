# 004 — Auction search and filters

## Problem

The auction grid returns every published/sold auction with no way to narrow it down. A buyer
cannot search by product name, filter by category/city/price, or start from their own city.
Searching "by product name" also exposes a real gap from spec 002: auctions have no name/title
field at all.

## Goals

- Add a required `title` field to auction creation (max length, clear feedback when exceeded).
- `GET /api/auctions` accepts optional query params: `search` (matches title), `category`,
  `city`, `minPriceCOP`, `maxPriceCOP`.
- The city filter defaults to the viewer's own profile city when they're logged in (still
  changeable/clearable).
- The frontend search box is debounced and the query building is memoized so typing feels
  instant and doesn't spam the backend.
- The filter mechanism is designed so a future simple filter (e.g. condition, delivery method) is
  a small, localized addition — not a redesign.
- Every new free-text input is validated against a whitelist character set (letters incl. Spanish
  accents, digits, spaces, basic punctuation), not a blacklist.

## Non-goals

- No full-text/fuzzy search, no relevance ranking — a case-insensitive substring match on title
  is enough for this spec.
- No saved searches, no search history.
- No pagination — out of scope until the grid is large enough to need it.
- No description field — only a short title, per the explicit scope of this spec.

## Acceptance criteria

### Title

- [ ] `POST /api/auctions` requires a non-empty `title` up to 80 characters, letters/digits/
      spaces/basic punctuation only (incl. Spanish accents); anything else is a 400 field error.
- [ ] `PATCH /api/auctions/:id` (draft only, as already established) can update `title` under the
      same validation.
- [ ] Auctions created before this spec display a sensible fallback title (humanized category)
      rather than breaking.
- [ ] The create-auction form shows the title field with inline feedback when the limit is
      exceeded, matching the existing per-field error style.
- [ ] The auction card and detail page show the title as their primary heading.

### Search and filters

- [ ] `GET /api/auctions?search=<text>` returns auctions whose title contains the text,
      case-insensitively.
- [ ] `GET /api/auctions?category=<value>` filters by exact category; an invalid category value
      is ignored (not an error), returning the unfiltered-by-category result.
- [ ] `GET /api/auctions?city=<value>` filters by the seller's city; an invalid city is ignored.
- [ ] `GET /api/auctions?minPriceCOP=<n>&maxPriceCOP=<n>` filters by price range; either bound
      alone works, an unparseable/out-of-range/inverted (`min > max`) pair is ignored.
- [ ] A `search` value containing characters outside the whitelist (e.g. `<script>`) never errors
      the request — it's sanitized (stripped/truncated) before matching.
- [ ] Filters can be combined; combining an always-empty search with other filters behaves the
      same as omitting `search`.

### Frontend

- [ ] The auctions page shows a filter bar: search box, category dropdown, city dropdown
      (defaulting to the logged-in user's city), min/max price inputs.
- [ ] Typing in the search box is debounced before triggering a request.
- [ ] Changing a filter updates the grid without a full page reload.

## Risks (explicit, not hidden)

- Filtering runs in-memory over the full JSON array on every request — fine at current scale;
  would need real query support (indexes) if the auction count grows large. Same story as every
  other JSON-backed list endpoint in this codebase.
- The city filter requires a per-result user lookup (`userRepository.findById`) after the
  Auction-native filters run — bounded by how many auctions survive those filters, not the whole
  dataset.
