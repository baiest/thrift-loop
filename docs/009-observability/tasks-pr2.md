# Tasks — PR2: instrumenting bids, notifications, scheduler, event bus, realtime

TDD throughout: write the failing test first, confirm it fails for the right reason, then write
the minimal code to pass. Each service/lib gains a `logger` collaborator, injected exactly like
`eventBus` already is; tests use a `FakeLogger` recording calls (same shape used in PR1's
middleware/async-handler tests).

## `services/bid.service.ts`

- [ ] Test: a successful `placeBid` logs `bid_placed` (info) with auctionId, bidderId, amountCOP,
      bidCount.
- [ ] Test: a validation failure (`HttpError`) logs `bid_rejected` (warning) with auctionId,
      bidderId, attemptedAmount, reason.
- [ ] Implement: `createBidService` takes a 6th arg, `logger`; wrap the existing mutex-protected
      block in one try/catch for logging only, no change to control flow or return shape.

## `services/notification.service.ts`

- [ ] Test: creating a notification for an eligible recipient logs `notification_created` (info).
- [ ] Test: a recipient with the relevant preference off logs `notification_skipped` (info, reason
      `preference_disabled`) instead of saving.
- [ ] Test: marking a non-existent/foreign notification read logs `notification_mark_read_failed`
      (warning).
- [ ] Implement: `createNotificationService` takes a 3rd arg, `logger`.

## `lib/publish-scheduler.ts`

- [ ] Test: a tick that publishes a due draft logs `auction_published` (info).
- [ ] Test: a tick that closes a due auction logs `auction_closed` (info).
- [ ] Test: a failing tick logs `scheduler_tick_failed` (critical) — replacing the existing
      `console.error` call.
- [ ] Test: one tick's cascade of publish/close actions share one `TICK-…` request id.
- [ ] Implement: `closeDueAuctions`/`startAuctionScheduler` take a `logger` arg; wrap each tick body
      in `runWithRequestId(createPrefixedId('TICK'), ...)`.

## `lib/event-bus.ts`

- [ ] Test: a listener that throws logs `event_listener_failed` (error) — replacing the existing
      `console.error` call.
- [ ] Implement: `createEventBus` takes a `logger` arg.

## `realtime/event-fanout.ts`

- [ ] Test: a failing notification push logs `notification_push_failed` (error) — replacing the
      existing `console.error` call.
- [ ] Implement: `attachEventFanout` takes a `logger` arg.

## `realtime/realtime-server.ts` / `authenticate-upgrade.ts`

- [ ] Test: a rejected upgrade (bad/missing session) logs `ws_upgrade_rejected` (warning, reason).
- [ ] Test: an established connection logs `ws_connection_opened` (info); its close logs
      `ws_connection_closed` (info).
- [ ] Test: an invalid inbound message logs `ws_message_invalid` (warning).
- [ ] Implement: `attachRealtime` takes a `logger` arg; each inbound message handled inside
      `runWithRequestId(createPrefixedId('WS'), ...)`.

## Wiring

- [ ] `container.ts`: thread `logger` into `createBidService`, `createNotificationService`,
      `createEventBus`.
- [ ] `create-server.ts`: thread `logger` into `attachRealtime`/`attachEventFanout`.
- [ ] `index.ts`: thread `logger` into `startAuctionScheduler`; add a `system_heartbeat` (info:
      memoryUsedMb, uptime) on a 5-minute interval.

## Verification

- [ ] `npm run verify` green across all workspaces.
- [ ] Manual: place a bid, run `npm run logs`, confirm `http_request` + `bid_placed` share one
      request id.
- [ ] Manual: let the scheduler close a due auction, confirm `auction_closed` and the resulting
      `notification_created` share one `TICK-…` request id.
