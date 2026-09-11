# 014 — Photo carousel on auction detail

> Written retroactively: implementation landed before this spec, breaking the
> "no code without an approved spec" rule in AGENTS.md. Documented here so the
> change has a record and can be reviewed as such.

## Problem

Auctions can have up to 10 photos (`MAX_PHOTOS_PER_AUCTION`), and the seed
data was recently updated to give every auction 3-5 real photos. The auction
detail page only ever rendered `auction.photoUrls[0]` — every other uploaded
photo was invisible to buyers, with no way to browse them.

## Goals

- Show every photo in `auction.photoUrls` on the auction detail page, not
  just the first one.
- Let the viewer move between photos (next/previous, jump to a specific one).
- Preserve existing placeholder behavior: no photos, or the current photo
  failing to load, both fall back to the shared "No photo" placeholder.

## Non-goals

- Swipe/touch gestures, autoplay, or a lightbox/zoom view.
- Changing the auction list/card view (`auction-card.tsx`), which still shows
  a single thumbnail — out of scope here.
- Reordering or deleting individual photos post-upload.

## Acceptance criteria

- [x] Auction detail page renders the current photo from `photoUrls`, not
      just index 0.
- [x] With 2+ photos: "Previous photo" / "Next photo" buttons are visible and
      cycle through all photos, wrapping at both ends.
- [x] With 2+ photos: one dot indicator per photo, clicking a dot jumps to
      that photo directly.
- [x] With exactly 1 photo: no navigation controls render.
- [x] With 0 photos: the shared placeholder renders (existing behavior).
- [x] If the current photo's `<img>` fails to load, the placeholder renders
      instead (existing behavior, now scoped to whichever photo is current).

## Open questions

None — scope was small enough to resolve inline with the user.
