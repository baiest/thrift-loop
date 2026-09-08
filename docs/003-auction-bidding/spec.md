# 003 — Auction browsing and bidding

## Problem

Spec 002 lets a seller create, edit, and publish a listing, but nobody else can see it —
`GET /api/auctions/:id` 404s for anyone but the owner, and nothing lets a second user actually
compete for the item. This spec adds a public grid of every listed auction, a detail page with
bid history and a live countdown, real competitive bidding with a rolling 30-minute window, and
assigns the winning item to the buyer once bidding closes.

## Goals

- Anyone (logged in or not) can browse a grid of every `published`/`sold` auction, seeing its
  first photo, current bid (or asking price), and condition.
- Anyone can open an auction's detail page: full info, bid history, and a live countdown to close.
- A logged-in user (not the seller) can place a bid at least `MIN_BID_INCREMENT_COP` above the
  current bid, or at the asking price if there are no bids yet.
- The first bid starts a 30-minute countdown; every subsequent bid resets it to 30 minutes.
- Concurrent bids on the same auction are serialized: only the first to arrive at the current
  price is accepted; the loser gets a clear rejection, not a silently lost write.
- When the window elapses, the auction closes automatically (background scheduler): status
  becomes `sold`, the highest bidder becomes the winner.
- The winner sees the item under "My purchases", with either the seller's pickup city or their
  own shipping address (if they have one and the auction allows delivery).
- A seller cannot bid on their own auction, and cannot edit an auction once it has a bid.
- A user can set an optional address on their profile.

## Non-goals

- **No buyer↔seller messaging or contact reveal.** The purchase view shows a place/address, not a
  phone number or chat. Flagged as the likely next gap, not solved here.
- **No payments.** Winning only assigns the item; no money moves through the platform.
- **No auction cancellation or no-bid expiry.** A published auction with zero bids stays listed
  indefinitely. `AuctionStatus` stays `'draft' | 'published' | 'sold'` — no `'ended'`/cancelled
  state, since nothing in this spec would ever set it.
- **No multi-instance deployment support for the bid lock.** The lock guaranteeing "first bid
  wins" is in-process only (see Risks). Fine for a single API instance; would need a real
  database's atomic conditional update to survive horizontal scaling.
- **No self-outbid restriction.** The current highest bidder may bid again to raise their own
  standing.

## Acceptance criteria

### Browsing

- [ ] `GET /api/auctions` (public) returns every `published`/`sold` auction, newest first.
- [ ] `GET /api/auctions/:id` (public) returns full detail plus `serverTime` for clock-drift
      correction, or 404 if the auction is a draft or doesn't exist.
- [ ] `GET /api/auctions/:id/bids` (public) returns the bid history, newest first.

### Bidding

- [ ] `POST /api/auctions/:id/bids` (authenticated) with `amountCOP` at least the minimum next
      bid succeeds: saves the bid, updates the auction's current bid/bidder, and (re)starts the
      30-minute window.
- [ ] A bid below the minimum is rejected (400) with a field error naming the minimum.
- [ ] The auction's own seller bidding is rejected (403).
- [ ] A bid on a `draft` or already-`sold` auction is rejected (409/404 as appropriate).
- [ ] A bid submitted after the window has elapsed is rejected (409), even before the scheduler
      has run.
- [ ] Two bids at the same valid amount arriving concurrently: exactly one succeeds, the other is
      rejected with a clear error — never a silently lost update.
- [ ] `PATCH /api/auctions/:id` on an auction that already has at least one bid is rejected (409),
      even though its status is still `published`.

### Closing and purchases

- [ ] A background scheduler closes auctions whose window has elapsed: sets `status: 'sold'` and
      assigns the winner from the highest bid, without any request triggering it.
- [ ] `GET /api/purchases` (authenticated) lists the caller's won auctions with a resolved
      shipping/pickup detail: their address if set and the auction allows delivery, otherwise the
      seller's city for pickup.

### Profile

- [ ] `PATCH /api/auth/me` (authenticated) lets a user set or clear their address.

### Frontend

- [ ] Sidebar gains "Auctions", "My purchases", and "My profile" entries.
- [ ] The auction grid shows every published/sold auction (including the caller's own, marked
      "Yours"), is responsive, and handles auctions with no photos gracefully.
- [ ] The detail page shows a live countdown, bid history, and (when eligible) a bid form with
      inline validation matching the backend's minimum.
- [ ] The countdown is driven by server time, not the raw client clock.

## Risks (explicit, not hidden)

- The bid lock is a single-process in-memory mutex. It is correct for one API instance; scaling
  to multiple instances would need a database-backed lock instead (e.g. Mongo's
  `findOneAndUpdate`). Documented, not solved, here.
- The closing scheduler ticks once a minute, so `status` can lag the true deadline by up to ~60s.
  The API's own bid-time guard is authoritative regardless of the scheduler's timing.
- No contact channel between buyer and seller beyond the resolved address/pickup city.
