# 008 — Notifications and realtime over WebSockets

## Problem

A bidder who gets outbid only finds out by reopening the auction. A seller never learns someone
bid on their listing. A winner learns nothing when their auction closes. The only "live" mechanism
today is a 5-second poll on the auction detail page, which already once tripped the API's own rate
limiter (spec 006 QA round). There is no way for a user to know what happened while they were away,
and browsing feels static — prices on the grid and on an open detail page only change on the next
poll or the next manual reload.

## Goals

- Three notification types, delivered in-app via a bell icon with a persisted, readable history:
  outbid, auction won, and someone bid on an auction you listed.
- Each notification type is independently configurable from My profile — a user can turn off any
  type they don't care about; all three are on by default.
- The platform reacts live over WebSockets when other users raise a bid: the auction detail page,
  the Auctions grid, and the bell all update without a manual reload or waiting for a poll.
- An auction flips to "Sold" live for everyone looking at it (detail page or grid card) the moment
  it closes, instead of waiting for the next poll.
- A viewer count ("N people viewing") on the auction detail page.

## Non-goals

- No browser push notifications (Notifications API) and no email/SMS delivery — in-app only.
- No notification for the seller when their auction sells ("your auction sold to X") — only the
  three types named above.
- No change to the bidding rules themselves (`placeBid`'s validation, minimum increment, bid
  window extension) — this spec only adds an event/notification layer on top.
- No true instant close: the auction-closing scheduler still ticks every 60s; realtime removes the
  extra ≤5s poll delay on top of that tick, not the tick itself.
- No multi-instance/horizontal-scaling support for the event bus or presence tracking — documented
  as a known limitation, not solved here.
- No message replay or delivery acknowledgement for the WebSocket channel; a reconnect resyncs over
  HTTP instead.

## Acceptance criteria

### Backend — events

- [ ] A typed in-process event bus (`EventBus`) exists in `apps/api/src/lib/`, injected through
      `container.ts`, with a `DomainEvent` union of `bid-placed` and `auction-closed`.
- [ ] `bid.service.ts`'s `placeBid` publishes `bid-placed` (including `previousTopBidderId`, `null`
      when there was no prior bid or when the previous top bidder is the same user raising their
      own bid) after its mutex-protected update completes.
- [ ] `publish-scheduler.ts`'s auction-closing path publishes `auction-closed` (including
      `winnerUserId`) where it already sets `{ status: 'sold', winnerUserId }`.

### Backend — notifications

- [ ] `packages/shared` exports `PublicNotification`, `NotificationType`,
      `NotificationPreferences`, and `DEFAULT_NOTIFICATION_PREFERENCES` (all three types on).
- [ ] A `NotificationRepository` (JSON-backed, `data/notifications.json`) supports listing by user
      (newest first), counting unread, saving one or many, marking one or all read.
- [ ] A `notification.service.ts` turns a `DomainEvent` into zero, one, or two persisted
      notifications, respecting each recipient's preferences; the auction owner and the bidder are
      never the same user (already enforced by `placeBid`'s own-auction check).
- [ ] `User` gains a `notificationPreferences` field (default all-on for existing users via the
      same legacy-normalize-on-read pattern already used for auctions).
- [ ] `GET /api/notifications` (authenticated) returns the list and an unread count.
- [ ] `POST /api/notifications/:id/read` and `POST /api/notifications/read-all` mark notifications
      read; a user cannot mark another user's notification read.
- [ ] `PATCH /api/notifications/preferences` updates one or more of the three toggles.

### Backend — realtime transport

- [ ] A WebSocket endpoint at `/api/realtime` authenticates the upgrade using the existing session
      cookie; an unauthenticated or malformed upgrade is rejected before a socket is established.
- [ ] Connected clients automatically join a per-user channel (for notifications) and may subscribe
      to a specific auction's channel and to the auctions-grid channel.
- [ ] A `bid-placed` event is broadcast to subscribers of that auction and of the grid; an
      `auction-closed` event is broadcast the same way and additionally pushes a notification to
      the winner.
- [ ] The server tracks distinct viewers per subscribed auction (not per connection — multiple tabs
      from one user count once) and broadcasts the count on join and leave.
- [ ] A dropped/half-open connection is detected and cleaned up (heartbeat), so presence counts and
      room membership cannot leak.

### Frontend

- [ ] A bell icon with an unread-count badge is reachable from the shell on every breakpoint: a
      popover panel on desktop/tablet, a link to a dedicated `/notifications` page on mobile. The
      same list component is reused in both places.
- [ ] The auction detail page's 5-second poll is removed and replaced by the WebSocket channel; the
      page still shows current data immediately after a reconnect (resync over HTTP), and shows a
      brief "Reconnecting…" state if the connection is down for more than a few seconds.
- [ ] The Auctions grid updates a card's price and bid count live, and flips a card to "Sold" live
      when its auction closes, without a page reload.
- [ ] The auction detail page shows a live "N people viewing" count.
- [ ] My profile has a "Notifications" section with three independent toggles (outbid, auction won,
      bid on my listing), each saving immediately without a separate Save action.
- [ ] Signed-out visitors never open a WebSocket connection and every page still renders normally.

## Open questions

- None blocking approval.
