# 012 — UX/bug repair pass

## Problem

Manual testing across mobile and desktop surfaced a batch of UX and correctness bugs
across bidding, filters, notifications, auction creation, and mobile layout. None are
new capabilities — each is a defect in an already-shipped flow. Grouped into one spec
since they're being triaged and fixed together as a repair pass.

## Goals

Fix each of the following, confirmed against the running app/logs:

1. **Bid button hidden when logged out.** It's not obvious bidding requires an
   account. The bid button/input should always render; clicking it while logged out
   should redirect to login (not hide the control).
2. **Field validation feedback doesn't clear on valid input.** Error/help text under
   an input only disappears on blur, not as soon as the value becomes valid while
   typing.
3. **Notification preference switches are visually broken on mobile.**
4. **Auction countdown flickers when it crosses from showing minutes as "Xm" to a
   different unit/format** — a re-render/format transition glitch, not a data bug.
5. **Mobile search bar + filter button layout is cramped** — the filter button eats
   space that the search input needs.
6. **Filter's price input isn't a currency-formatted input** (no thousands
   separators/COP formatting), unlike the price inputs elsewhere in the app.
7. **Bottom mobile nav is missing "My bids."**
8. **Bid amount input won't go to empty or 0 to type a new higher amount** — can't
   clear the field to overwrite it, confirmed in logs: repeated `bid_rejected`
   (`reason: "Validation failed"`, same `attemptedAmount`) from a user stuck retyping
   over an amount they couldn't clear (`apps/api/data/logs/app.jsonl`,
   `04:40:32–04:40:46Z`).
9. **Bids don't update in real time on the bid form/current-price display** — need to
   confirm whether the WebSocket message is actually being sent for this UI element
   (other realtime surfaces, e.g. the grid card, do update — see spec 008).
10. **Notifications don't appear on mobile.**
11. **Image preview thumbnails' remove/reorder buttons overlap on mobile.**
12. **Text inputs no longer show a character-count/max-length hint below the field.**
13. **Auction creation can silently duplicate.** Confirmed in logs: 3x
    `auction_created` for the same user 16 seconds apart with no `photos_uploaded`
    event for any of them (`app.jsonl`, `04:49:37Z`, `04:49:46Z`, `04:49:53Z`) — the
    UI reported failure and the user retried, but the auction(s) _were_ created
    server-side each time, and the photo upload step never completed for any of the
    three.
14. **Auctions can't be deleted.**
15. **Auction status/condition pills overflow the card boundary on mobile.**
16. **Search filters don't persist.** Removing a filter (e.g. a city like "Cali") and
    reloading brings it back — filter state isn't actually being saved/cleared where
    the user expects.
17. **Bottom mobile nav is missing "My purchases."** A user who won a bid has no way
    to reach `/purchases` on mobile — same structural gap as #7 ("My bids"), just
    for the other list.
18. **Notification toggle switches render broken** (found while fixing #3, via an
    iframe-based mobile-viewport check since the sandbox's real window resize
    doesn't affect CSS media queries here): the thumb renders mostly _outside_ its
    track, right edge only. Root cause: Chromium centers a `<button>`'s content via
    an internal flex algorithm, which corrupts the toggle thumb's implicit
    `position: absolute` static-position resolution (it had no explicit `left`).
    Not a screen-size-specific bug — it was broken everywhere, just never noticed
    because it happens to look "almost fine" if you don't look closely at the track
    edges.
19. **Mobile bottom nav overflowed horizontally once "My bids"/"My purchases"/
    notifications were added** (self-inflicted during this same repair pass —
    caught before merging): 7 tabs' combined width (540px) exceeded the 375-390px
    viewport, hiding "Profile"/"Alerts" behind a horizontal scroll.

## Non-goals

- No new features — every item above is a regression/defect against existing,
  already-specced behavior (specs 002–008).
- Not re-designing the pages touched — fixes should stay within the current visual
  language (see spec 006/011 for the design system).

## Acceptance criteria

- [ ] Bid control always visible when logged out; clicking it redirects to `/login`.
- [ ] Field validation message clears as soon as the input becomes valid, without
      requiring blur.
- [ ] Notification preference switches render correctly on mobile viewport widths.
- [ ] Countdown display no longer flickers/re-renders visibly across unit-format
      transitions.
- [ ] Mobile search bar and filter button both have usable, non-cramped widths.
- [ ] Filter's price input formats as currency (matches other COP inputs in the app).
- [ ] Mobile bottom nav includes "My bids."
- [ ] Bid input can be cleared to empty/0 and a new higher amount typed and submitted.
- [ ] Placing a bid updates the current-price/bid display for other connected clients
      without a reload; root cause of any missing WS emission is identified and fixed.
- [ ] Notifications appear on mobile same as desktop.
- [ ] Image preview action buttons don't overlap on mobile.
- [ ] Text inputs with a max length show the character-count hint again.
- [ ] Submitting the create-auction form exactly once yields exactly one auction with
      its photo(s) attached, even under slow network/retry conditions; a real failure
      never leaves an orphaned auction record.
- [ ] Auction owners can delete an auction (at least while it's a draft/unsold).
- [ ] Status/condition pills stay within the card bounds on mobile.
- [ ] Filter selections persist across reload until explicitly cleared by the user.
- [ ] Mobile bottom nav includes "My purchases."
- [ ] Notification toggle switches render correctly (thumb fully inside its track).
- [ ] Mobile bottom nav's 7 destinations fit without horizontal scrolling.

## Open questions

- None blocking — each item is independently fixable; will investigate root cause
  per item during implementation and note anything that turns out to be more
  involved than expected (e.g. #9 and #13 look related — both may trace back to how
  the create-auction flow and its network layer handle retries/errors).
