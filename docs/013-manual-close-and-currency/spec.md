# 013 — Manual auction close, winner celebration, currency fix

## Problem

1. An auction's owner can only close it by waiting for the countdown to reach
   zero — the only code path that sets `status: 'sold'` is the scheduler
   (`apps/api/src/lib/publish-scheduler.ts`). Sellers have no way to accept
   the current highest bid and end the auction early.
2. When the winning bidder is looking at an auction's page at the exact
   moment it closes, nothing marks the moment as special — no visual
   celebration, even though a live realtime push already tells the page it
   just won.
3. Every price on the site (`formatCOP`) renders with a bare `$` symbol.
   `Intl.NumberFormat('es-CO', { currency: 'COP' })` picks `$` as COP's
   symbol in that locale — the same glyph as USD — so it reads as dollars to
   users, even though it's pesos.

## Goals

- Let an auction's owner close a `published` auction early, once it has at
  least one bid, awarding it to the current highest bidder — the same winner
  the scheduler would have picked.
- Show a one-time, in-the-moment celebration (confetti) to the winner if
  they're viewing the auction's page when it closes (by timer or manually).
- Make every price on the site unambiguously Colombian pesos.

## Non-goals

- Closing an auction with zero bids (no buyer to award it to).
- A "you won" celebration on a later visit to an already-sold auction (the
  existing "Sold" badge and `auction-won` notification already cover that).
- Any change to how the scheduler closes auctions on time.
- Adding a third-party animation/confetti library.

## Acceptance criteria

- [x] The auction owner sees a "Mark as sold" control on their own
      `published` auction once it has at least one bid; it requires
      confirmation before acting.
- [x] Confirming it closes the auction, awarding it to the current highest
      bidder, and behaves identically to a timer-based close from every other
      surface: `auction-won` notification to the winner, realtime broadcast
      to viewers, "Sold" badge/status everywhere.
- [x] The control does not appear to non-owners, on auctions with no bids, or
      on auctions that are `draft` or already `sold`.
- [x] A viewer who is the winner and has the auction's page open at the
      moment it closes (by timer or by the owner's manual close) sees a
      confetti celebration, once, without needing to reload.
- [x] Any other viewer (including the owner, or a losing bidder) on the same
      page at that moment does not see the celebration.
- [x] Visiting an already-sold auction afterward never shows the
      celebration, regardless of who won it.
- [x] Every rendered price across the app (listings, bids, notifications)
      is unambiguous Colombian pesos, not readable as US dollars.

## Open questions

None — scope and format decisions confirmed with the user before this spec
was written.
