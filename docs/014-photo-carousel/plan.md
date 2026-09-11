# 014 — Plan

## Approach

Add a new `PhotoCarousel` molecule (`apps/web/src/components/molecules/photo-carousel.tsx`)
that owns its own `index` state and renders the current photo from a
`photoUrls` array, plus prev/next buttons and dot indicators when there's
more than one photo. Replace the page-local `AuctionPhoto` function and its
`photoFailed` state in `auction-detail-page.tsx` with this component,
keeping the existing placeholder fallback behavior.

Kept scoped to the detail page only — `auction-card.tsx` (list view) keeps
showing a single thumbnail, since a full carousel doesn't fit a small card
and wasn't part of what broke.

## Key decisions

- Own the "current index" and "failed url" state inside `PhotoCarousel`
  itself, not lifted to the page — the page has no other reason to know
  which photo is showing. Mirrors how `photoFailed` was already page-local
  before this change.
- Failure fallback is per-photo, not per-auction: if photo 2 fails to load,
  navigating back to photo 1 (which still works) shows photo 1, not a
  permanently-broken carousel. `failedUrl` is compared against the current
  URL and cleared on navigation.
- Wrap-around navigation (next from last goes to first, previous from first
  goes to last) — standard carousel behavior, avoids dead-end buttons.

## Affected areas

- `apps/web/src/components/molecules/photo-carousel.tsx` (new)
- `apps/web/src/components/molecules/photo-carousel.test.tsx` (new)
- `apps/web/src/pages/auction-detail-page.tsx` (removes `AuctionPhoto` +
  `photoFailed` state, renders `PhotoCarousel`)

## Risks

- None significant — additive UI change, existing `photoUrls` API shape is
  unchanged, no backend touched.

## Test strategy

TDD, component-level with Testing Library:

- 0 photos → placeholder.
- 1 photo → image renders, no nav buttons.
- 3 photos → starts at index 0, one dot per photo.
- Next/previous navigation, including wrap-around at both ends.
- Clicking a dot jumps directly to that photo.
- Current photo `onError` falls back to the placeholder.

`auction-detail-page.test.tsx`'s existing placeholder/photo-error tests were
kept unchanged and re-run to confirm the page-level contract didn't shift.
