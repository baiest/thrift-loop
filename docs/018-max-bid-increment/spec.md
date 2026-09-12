# 018 — Max bid increment

## Problem

`isValidNextBid` (`packages/shared/src/bid.ts`) only validates a bid from below: it must beat
the current bid by `MIN_BID_INCREMENT_COP`, but nothing stops a bid from jumping arbitrarily
far ahead (capped only by the global `MAX_PRICE_COP`). On a 40.000 COP auction a bidder can
place 900.000.000 COP in one move, ending the auction instantly — whether by mistake or on
purpose. Sellers have no way to keep the bidding gradual on their own auctions.

## Goals

- A new required field, `maxBidIncrementCOP`, is set by the seller when creating an auction —
  the maximum amount a single bid may exceed the current bid (or the start price, before any
  bid exists) by.
- `isValidNextBid` (`packages/shared/src/bid.ts`) rejects a bid above
  `currentBidCOP ?? priceCOP` plus `maxBidIncrementCOP`, in addition to the existing
  minimum-bid check.
- Creating an auction rejects a `maxBidIncrementCOP` below `MIN_BID_INCREMENT_COP` — a smaller
  cap would make every bid after the first impossible to place, deadlocking the auction.
- The field is entered with the same `CurrencyInput` money control the start price already
  uses, in the wizard's Pricing step, directly below the price field.
- A bid rejected for exceeding the cap gets the same error shape as today's minimum-bid
  rejection (`HttpError` 400, `fields.amountCOP`), so `BidForm` renders it without changes.

## Non-goals

- No client-side range validation or hint in `BidForm` — enforcement is server-side only.
- No ability to edit `maxBidIncrementCOP` after an auction is published (already blocked:
  `updateAuction` rejects any edit once `status !== 'draft'`).
- No change to `MIN_BID_INCREMENT_COP`, the 30-minute bid window, or auction close behavior.
- No migration script for already-stored auctions — see acceptance criteria below.

## Acceptance criteria

- [ ] Creating an auction requires `maxBidIncrementCOP`: a missing, non-integer, or
      below-`MIN_BID_INCREMENT_COP` value is rejected with `fields.maxBidIncrementCOP`.
- [ ] A bid within `[minimumNextBid, currentBidCOP ?? priceCOP + maxBidIncrementCOP]` is
      accepted.
- [ ] A bid above the ceiling is rejected with HTTP 400 and `fields.amountCOP` naming both the
      minimum and maximum allowed amount.
- [ ] Before any bid exists, the ceiling is measured from `priceCOP`, not from `null`.
- [ ] An auction stored before this change (no `maxBidIncrementCOP` in its JSON row) is read
      back with an effectively uncapped ceiling (`MAX_PRICE_COP`), so existing auctions keep
      behaving as they do today.
- [ ] The wizard's Pricing step shows a "Max bid increment (COP)" `CurrencyInput` below the
      price input and blocks moving to the next step until it holds a valid value.

## Open questions

- None blocking — required-at-creation, first-bid-measured-from-start-price, and
  reject-with-400 were all confirmed with the user before this spec was written.
