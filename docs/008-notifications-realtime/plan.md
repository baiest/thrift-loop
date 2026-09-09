# 008 — Plan

## Approach

Delivered as one spec, three sequential PRs, each ending on a green `npm run verify`:

1. **`feat/008-notifications`** — notifications end-to-end over plain HTTP: event bus, producers
   in `bid.service.ts` and `publish-scheduler.ts`, notification persistence/preferences/routes, and
   the full frontend (bell, panel, `/notifications` page, profile toggles). The bus is wired
   directly to the notification service in `index.ts`, no WebSocket yet. Fully useful on its own.
2. **`feat/008-realtime-transport`** — the WebSocket layer (`ws`, upgrade auth, hub, server),
   replaces the temporary direct wiring with `event-fanout.ts`, pushes notifications live to the
   bell, and removes the 5s poll on the auction detail page in favor of live bid updates.
3. **`feat/008-realtime-grid-presence`** — live Auctions grid updates, live close-to-Sold on the
   grid, and the viewer-count presence feature.

This document covers the design for all three; only PR 1 is being implemented right now.

## Key decisions

- **`ws`, not `socket.io`.** Only auth-on-upgrade, rooms, and JSON envelopes are needed — a small
  surface over `ws`. `socket.io` adds its own client bundle, wire protocol, and a much larger
  transitive dependency surface against `npm audit --audit-level=high` in CI. The browser side
  stays the native `WebSocket`.
- **A typed in-process event bus is the layering seam.** `services/` must never import `express` or
  a WS server. `lib/event-bus.ts` is pure — no `express`, no `fs` — so `bid.service.ts` and
  `publish-scheduler.ts` may depend on it like any other injected collaborator, and the realtime
  adapter (introduced in PR 2) subscribes from the outside. Producers are the services, not the
  routes or the route-adjacent scheduler caller, because only `placeBid` has the previous top
  bidder in scope and only the close path decides the winner.
- **Publish after the mutex, compute inside it.** `placeBid` builds the event payload using data
  read inside `mutex.runExclusive` (the pre-update `currentBidCOP` and the previous top bidder) and
  calls `eventBus.publish` once the callback resolves, not before. Publishing inside the lock would
  extend the critical section with every listener's work (a file write, in PR 1) for every other
  bidder waiting on that same auction, and could announce a bid that a later validation throw
  rolled back.
- **The socket is never the source of truth (relevant from PR 2 onward).** Every reconnect will
  bump a resync signal that pages include in their fetch dependencies, so a missed frame self-heals
  over HTTP instead of requiring message replay.
- **Preferences are a nested object on `User`**, normalized on read against
  `DEFAULT_NOTIFICATION_PREFERENCES` the same way `auction.repository.json.ts` normalizes legacy
  auctions — one `LegacyUser` type, one `normalize()`, applied in `readAll()`. Rejected: three flat
  boolean columns on `User`, which would spread the concept across the model instead of keeping it
  as one importable shape.
- **Notifications get their own router**, not an extension of the profile update route, because
  `pickPresentStringFields` (`lib/request-body.ts`) is string-typed by construction and forcing
  booleans through it would mean encoding them as `"true"`/`"false"` strings. A sibling
  `pickPresentBooleanFields` is added instead.
- **The bell's list is one component, reused twice** — as a popover body on desktop/tablet and as
  the whole of a `/notifications` page on mobile, where the tab bar is fixed at 4 items and a
  popover has nowhere to live.

## Data flow (PR 1 — this implementation)

```
apps/api/src/lib/event-bus.ts                createEventBus(): EventBus
apps/api/src/container.ts                    builds one EventBus, adds to Container
apps/api/src/services/bid.service.ts         placeBid publishes 'bid-placed' after the mutex
apps/api/src/lib/publish-scheduler.ts        closeOneAuction publishes 'auction-closed'
apps/api/src/services/notification.service.ts  recordForEvent(event) -> PublicNotification[]
  -> filters by each recipient's notificationPreferences
  -> notificationRepository.saveMany(...)
apps/api/src/index.ts                        eventBus.subscribe(event => notificationService
                                              .recordForEvent(event)) — temporary direct wiring,
                                              replaced by event-fanout.ts in PR 2
apps/api/src/routes/notification.routes.ts   GET /, POST /:id/read, POST /read-all,
                                              PATCH /preferences
apps/web/src/lib/api-client.ts               fetchNotifications, markNotificationRead,
                                              markAllNotificationsRead,
                                              updateNotificationPreferences
apps/web/src/components/organisms/notification-bell.tsx   popover (desktop/tablet) / link (mobile)
apps/web/src/components/organisms/notification-panel.tsx  shared list, reused by the bell and by
apps/web/src/pages/notifications-page.tsx                 the dedicated mobile page
apps/web/src/pages/profile-page.tsx          "Notifications" section, three Toggle atoms
```

Realtime transport (`create-server.ts`, `realtime/*`, `realtime-client.ts`, `realtime-store.ts`,
live grid/detail/presence) is designed above in the approved plan file but built in PR 2 and PR 3.

## Non-goals carried from spec.md

No browser push, no email/SMS, no seller "sold" notification, no bidding-rule changes, no
multi-instance support, no message replay/acks, no true instant close (still bounded by the 60s
scheduler tick).

## Risks

- **Whole-file JSON rewrites** on every notification, like every other repository in this codebase.
  Mitigated by `saveMany` (one write per fan-out, since one event can produce up to two
  notifications) and a per-user cap so the file cannot grow unbounded; still a scaling wall,
  acceptable at this app's current scale.
- **Single-process event bus** — a real constraint from PR 2 onward once a WebSocket hub subscribes
  to it, but already worth naming now: the `EventBus` interface is deliberately small so a
  Redis-backed implementation is a one-file swap later, not a redesign.

## Test strategy

- `lib/event-bus.test.ts`: subscribe → publish → received; unsubscribe stops delivery; a throwing
  listener neither blocks the next listener nor escapes `publish`.
- `services/bid.service.test.ts`: extend with a fake bus (`{ publish: vi.fn(), subscribe: () => ()
=> {} }`); assert `previousTopBidderId` is `null` on the first bid, the prior bidder on a second,
  and the same bidder when they raise their own winning bid; assert `publish` is called after the
  repository update (via mock call order).
- `lib/publish-scheduler.test.ts`: extend to assert `auction-closed` is published with the right
  `winnerUserId`, and that no event fires when an auction has no bids to close with.
- `services/notification.service.test.ts`: fakes for the notification and user repositories; the
  full preference matrix (3 types × on/off), the two skip rules (first bid, self-raise), and that
  marking another user's notification read fails.
- `repositories/notification.repository.json.test.ts`: temp-dir pattern already used by the other
  JSON repository tests; newest-first ordering, unread count, `saveMany` as a single write.
- `routes/notification.routes.test.ts`: supertest against `createApp`, mirroring
  `auction.routes.test.ts`'s auth/CSRF coverage; boolean-only body rejection for `/preferences`.
- Frontend: `api-client.test.ts` additions follow the existing mock-fetch pattern;
  `notification-bell.test.tsx`, `notification-panel.test.tsx`, `notification-item.test.tsx`,
  `toggle.test.tsx`, and an extension of `profile-page.test.tsx` for the new section — all render
  from props/seeded data, no socket involved in PR 1.
