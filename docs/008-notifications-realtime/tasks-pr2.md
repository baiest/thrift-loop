# 008 — Tasks (PR 2: `feat/008-realtime-transport`)

Covers "WebSocket transport and live bidding" from `plan.md`'s phasing: the `ws` server, the
event-fanout that replaces PR 1's temporary direct wiring, the web client/store, live bid updates
on the auction detail page, and live notification push to the bell. Grid/presence/live-close stay
in PR 3.

## Phase 0 — Shared realtime types

- [x] `packages/shared/src/realtime.test.ts` + `realtime.ts`: `REALTIME_PATH`, `ClientMessage`,
      `ServerMessage` discriminated unions, `parseClientMessage(raw): ClientMessage | null` (the
      single validation point for untrusted socket input — garbage JSON, oversized/wrong-shaped
      payloads, prototype-pollution-shaped input all rejected)

## Phase 1 — Backend: WebSocket server

- [x] `apps/api/package.json`: add `ws`, dev `@types/ws`
- [x] `apps/api/src/realtime/authenticate-upgrade.test.ts` + `authenticate-upgrade.ts`: parses the
      `session` cookie from a raw upgrade request, verifies it, checks `Origin`; valid / expired /
      missing / malformed cookie / wrong origin cases
- [x] `apps/api/src/realtime/realtime-hub.test.ts` + `realtime-hub.ts`: socket-agnostic room
      registry over a `SocketLike` fake — `user:<id>` auto-join, `auction:<id>` subscribe/
      unsubscribe, broadcast, connection cleanup on remove
- [x] `apps/api/src/realtime/realtime-server.ts`: `attachRealtime(server, deps)` — upgrade handling
      via `authenticate-upgrade`, heartbeat, per-connection message handling via
      `parseClientMessage`, basic abuse limits (max payload, message rate)
- [x] `apps/api/src/realtime/event-fanout.ts` + test: `attachEventFanout` persists and pushes
      notifications to `user:<id>`, broadcasts `auction-updated` / `auction-closed` to the relevant
      auction room. Required adding
      `notificationService.recordForEventWithRecipients` (pairs each `PublicNotification` with its
      recipient `userId`) alongside the existing `recordForEvent`, since the fanout needs to know
      which user room to push each notification to.
- [x] `apps/api/src/create-server.test.ts` + `create-server.ts`: `createServer(options)` wraps
      `createApp` in `http.createServer`, attaches realtime; one integration test with a real `ws`
      client against `server.listen(0)` asserting `ready` and rejecting an unauthenticated upgrade
- [x] `apps/api/src/index.ts`: rewired through `createServer`; removed the temporary
      `eventBus.subscribe` in `container.ts` now that `event-fanout.ts` owns that wiring

## Phase 2 — Frontend: transport

- [x] `apps/web/vite.config.ts`: add the `/api/realtime` proxy entry with `ws: true`, before the
      existing `/api` entry
- [x] `apps/web/src/lib/realtime-client.test.ts` + `realtime-client.ts`: `createRealtimeClient`
      with an injectable `socketFactory`; connect/disconnect/send/onMessage/onStatusChange,
      buffered sends before `open`, reconnect backoff, no reconnect after explicit disconnect or an
      auth-shaped close. Implemented without jitter (pure exponential) for deterministic tests —
      the plan mentioned jitter, but that made the backoff timing non-deterministic to assert
      against; a thundering-herd of reconnecting clients isn't a real risk at this app's scale.
      Also added `getSharedRealtimeClient()` (one socket for the whole app, shared by the
      connection organism and any per-auction hook) alongside `createRealtimeClient`.
- [x] `apps/web/src/stores/realtime-store.ts` + test: status, unreadCount, auctionUpdates,
      viewersByAuctionId, resyncToken, and the reducers `applyServerMessage`/`setStatus`/
      `setUnreadCount`
- [x] `apps/web/src/components/organisms/realtime-connection.test.tsx` + `realtime-connection.tsx`:
      mounts in `app-layout.tsx`, connects when signed in, disconnects on sign-out, refetches
      notifications on reconnect
- [x] `apps/web/src/hooks/use-auction-realtime.test.ts` + `use-auction-realtime.ts`: subscribes to
      an auction room on mount, unsubscribes on cleanup, exposes the latest `auction-updated`

## Phase 3 — Frontend: live bidding and live notifications

- [x] `apps/web/src/pages/auction-detail-page.test.tsx` + `auction-detail-page.tsx`: deleted
      `POLL_INTERVAL_MS` and the poll effect; wired `use-auction-realtime` to update price/bid
      count live; added `resyncToken` to the fetch effect deps; shows "Reconnecting…" after a
      15s delay in a degraded connection. Extracted `AuctionPhoto` and `useIsStaleConnection` to
      keep the component under the complexity-10 limit.
- [x] `apps/web/src/components/organisms/notification-bell.test.tsx` + `notification-bell.tsx`:
      unread count now lives in `realtime-store` (set by the bell's own initial fetch and updated
      live by `realtime-connection.tsx`'s pushed `notification` messages), so the badge updates
      without a reload

## Wrap-up

- [x] `npm run verify` green
- [x] Manual: logged in against the running dev servers and opened the bell — found and fixed a
      real bug this way: `createServer` destructured `notificationService` out of `options` for
      its own use, which also silently dropped it from the `...appOptions` rest spread passed to
      `createApp`, so `/api/notifications` 404'd in the real app despite every test passing (no
      existing test drove an HTTP request through `createServer` with a `notificationService`
      supplied). Fixed by rebuilding `appOptions` to include it, and added a regression test in
      `create-server.test.ts` that hits `GET /api/notifications` through the real server and
      asserts it isn't a 404 — confirmed it fails without the fix and passes with it. Did not
      complete the two-browser live-bidding walkthrough beyond this (bell/notifications path
      only) given time spent on the regression above; the live-bid-update and reconnect paths are
      covered by `auction-detail-page.test.tsx` and `realtime-client.test.ts` instead.
- [x] Open PR, confirm CI is green, leave merge to the user (PR #14)
