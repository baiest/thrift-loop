# 007 — My bids: dedicated history page and in-grid indicator

## Problem

A bidder has no way to see the auctions they've bid on except by revisiting each one from memory.
"My purchases" only lists auctions they've _won_ after the fact. There is no page listing bids in
progress, and while browsing the Auctions grid, a card gives no hint that the viewer has already
bid on that item — they have to open it to find out.

## Goals

- A new "My bids" page lists every auction the signed-in user has bid on, one row per auction
  (not one row per historical bid), showing their own highest bid on it, the auction's current
  price, and a status (Winning / Outbid / Won / Lost / Ended) so a bidder can tell at a glance
  where they stand without opening each auction.
- "My bids" is reachable from the shell the same way "My auctions" and "My purchases" are today:
  a sidebar/tablet-rail nav item and a route.
- On the Auctions browse grid, a card for an auction the viewer has already bid on shows their
  bid amount inline, so this is visible without leaving the grid.

## Non-goals

- No change to the bidding flow itself (`BidForm`, `bid.service.ts`'s `placeBid`) — this spec only
  adds read paths.
- "My bids" does not replace or merge with "My purchases"; a won auction still only shows in
  Purchases, though it may also appear in My bids as "Won" for continuity.
- No real-time updates (polling) on the My bids page itself — the existing per-auction detail page
  already polls; this list is a snapshot fetched on load, matching how "My purchases" behaves
  today.
- No pagination — matches every other list page in the app today.

## Acceptance criteria

### Backend

- [ ] `BidRepository` gains `findByUserId(userId): Promise<Bid[]>`, implemented in the JSON
      repository the same way `findByAuctionId` is (filter + sort newest first).
- [ ] `bid.service.ts` gains `listMyBids(userId): Promise<PublicMyBid[]>`: for every distinct
      auction the user has bid on, resolve their own highest bid on it, the current auction state,
      and whether they are currently winning (`myBidCOP === auction.currentBidCOP` while the
      auction is `published`). One entry per auction, newest-bid-first.
- [ ] `GET /api/auctions/my-bids` (authenticated) returns `{ bids: PublicMyBid[] }`, mounted before
      the `/:id` route like `/mine` and `/purchases` already are.
- [ ] `packages/shared` exports `PublicMyBid { auction: PublicAuction; myBidCOP: number; isWinning:
    boolean }`.

### Frontend

- [ ] A "My bids" page at `/my-bids`, reachable only when signed in (same auth-guard pattern as
      `PurchasesPage`), rendering one row per `PublicMyBid`: auction title, current price, the
      user's own bid, a status pill, and time remaining if still open (reusing `formatTimeLeft`).
- [ ] A "My bids" nav item exists in the desktop sidebar and tablet rail (an icon is needed; the
      mobile tab bar stays at its existing 4 items, matching how "My purchases" is already handled
      — reachable by URL, not added to the bottom tab bar).
- [ ] `AuctionCard` shows the viewer's own bid amount (e.g. "You bid $50.000") when one is known,
      without changing the card's layout for auctions the viewer hasn't bid on.
- [ ] The Auctions page fetches the viewer's bids alongside auctions (only when signed in) and
      passes each card its own bid amount, if any.

## Open questions

- None blocking approval.
