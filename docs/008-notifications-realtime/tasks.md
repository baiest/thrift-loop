# 008 — Tasks

This file tracks **PR 1 (`feat/008-notifications`)** only — notifications end-to-end over HTTP,
no WebSockets yet. PR 2 (`feat/008-realtime-transport`) and PR 3
(`feat/008-realtime-grid-presence`) get their own tasks lists opened as separate branches/PRs when
that work starts, per `plan.md`'s phasing.

## Phase 0 — Shared types

- [x] `packages/shared/src/notification.test.ts` + `notification.ts`: `NOTIFICATION_TYPES`,
      `NotificationType`, `isNotificationType`, `PublicNotification`, `NotificationPreferences`,
      `DEFAULT_NOTIFICATION_PREFERENCES` — export from `index.ts`

## Phase 1 — Backend: event bus and producers

- [x] `apps/api/src/lib/event-bus.test.ts` + `event-bus.ts`: `createEventBus()` — subscribe,
      publish, unsubscribe, a throwing listener doesn't block others or escape `publish`
- [x] `apps/api/src/container.ts`: build one `EventBus`, add to `Container`
- [x] `apps/api/src/services/bid.service.test.ts` + `bid.service.ts`: `placeBid` takes `eventBus`,
      publishes `bid-placed` (with `previousTopBidderId`) after the mutex-protected update
- [x] `apps/api/src/lib/publish-scheduler.test.ts` + `publish-scheduler.ts`: `closeOneAuction`
      takes `eventBus`, publishes `auction-closed` with `winnerUserId`; no event when there are no
      bids to close with
- [x] `apps/api/src/models/user.ts`, `repositories/user.repository{,.json}.ts`,
      `services/auth.service.ts`, `packages/shared/src/user.ts`: added
      `notificationPreferences`, legacy-normalized on read (done early, alongside the producers,
      since `bid.service.ts`'s event payload needed the shape settled first)

## Phase 2 — Backend: notification persistence and preferences

- [x] `apps/api/src/models/notification.ts`: `Notification` model
- [x] `apps/api/src/repositories/notification.repository.ts`: interface
- [x] `apps/api/src/repositories/notification.repository.json.test.ts` + `.json.ts`: JSON-backed
      impl over `data/notifications.json` — `findByUserId`, `countUnread`, `save`, `saveMany`,
      `markRead`, `markAllRead`
- [x] `apps/api/src/services/notification.service.test.ts` + `notification.service.ts`:
      `recordForEvent`, `list`, `markRead`, `markAllRead`, `updatePreferences` — full preference
      matrix, first-bid skip, self-raise skip, cross-user markRead rejection
- [x] `apps/api/src/lib/request-body.test.ts` + `request-body.ts`: add
      `pickPresentBooleanFields<T>`
- [x] `apps/api/src/routes/notification.routes.test.ts` + `notification.routes.ts`: `GET /`,
      `POST /:id/read`, `POST /read-all`, `PATCH /preferences` — mounted in `create-app.ts` at
      `/api/notifications`
- [x] `apps/api/src/container.ts` + `index.ts`: build the notification repo/service, subscribe
      `notificationService.recordForEvent` to the event bus (temporary direct wiring, replaced by
      `event-fanout.ts` in PR 2)

## Phase 3 — Frontend: bell, panel, and preferences

- [x] `apps/web/src/lib/api-client.test.ts` + `api-client.ts`: `fetchNotifications`,
      `markNotificationRead`, `markAllNotificationsRead`, `updateNotificationPreferences`
- [x] `apps/web/src/components/atoms/icon.test.tsx` + `icon.tsx`: add `'bell'` to `IconName`
- [x] `apps/web/src/components/atoms/toggle.test.tsx` + `toggle.tsx`: new `Toggle` atom
- [x] `apps/web/src/components/molecules/notification-item.test.tsx` + `notification-item.tsx`:
      presentational row for one `PublicNotification`
- [x] `apps/web/src/components/organisms/notification-panel.test.tsx` + `notification-panel.tsx`:
      list, "Mark all read", empty state
- [x] `apps/web/src/components/organisms/notification-bell.test.tsx` + `notification-bell.tsx`:
      popover on desktop/tablet, link on mobile; unread badge; mounted in `sidebar-nav.tsx`
- [x] `apps/web/src/pages/notifications-page.test.tsx` + `notifications-page.tsx` +
      `apps/web/src/app.tsx`: `/notifications` route reusing `NotificationPanel`
- [x] `apps/web/src/pages/profile-page.test.tsx` + `profile-page.tsx`: "Notifications" section,
      three `Toggle`s, each saving immediately

## Wrap-up

- [x] `npm run verify` green
- [x] Manual: signed in as a seed user against the running dev servers, confirmed the bell popover
      renders (fixed a `right-0` positioning bug that clipped it off-screen inside the narrow
      sidebar), the three preference toggles reflect and persist their state across a reload, and
      no socket/console errors appear. The outbid/won/bid-on-listing event → notification wiring
      itself is covered by `notification.service.test.ts`'s full preference matrix rather than a
      manual two-browser bid session.
- [ ] Open PR, confirm CI is green, leave merge to the user
