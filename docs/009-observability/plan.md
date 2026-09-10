# Spec 009 — Observability: structured logging, correlation, and a local log viewer

## Context

Right now the backend has no real logging: six scattered `console.error`/`console.log` calls
(`index.ts`, `lib/async-handler.ts`, `lib/event-bus.ts`, `lib/publish-scheduler.ts` ×2,
`realtime/event-fanout.ts`) are the only trace of what happened when something goes wrong, none of
them structured, none of them correlated to the request/transaction that caused them, and there's
no visibility into timing or memory at all. Debugging "why did this bid get rejected" or "why did
this notification never arrive" today means reading raw stdout with no way to tie the pieces
together.

The user asked for: a logger service producing structured entries — a `snake_case` `event` name,
useful business context (bid id, user id, etc.), a request ID that links every log line belonging
to one transaction, four levels (`info`/`warning`/`error`/`critical`), and metrics (memory used,
response time, execution time) — written to a JSONL file, plus a simple local web page (no
Grafana) to browse it.

Delivered as **one spec, two PRs**: PR 1 is the core logging infrastructure (useful on its own —
every HTTP request becomes traceable — plus the viewer to read it); PR 2 instruments the business
logic (bids, notifications, scheduler, realtime) and retires the existing bare `console.*` calls.

## Key decisions

- **Correlation via `AsyncLocalStorage`, not a threaded parameter.** A `requestId` needs to reach
  deep into service/repository/event-bus code without adding a parameter to a dozen function
  signatures. `node:async_hooks` (Node 22, already the pinned runtime) solves exactly this. A new
  `lib/request-context.ts` wraps one HTTP request (or one scheduler tick, or one WS message) in
  `runWithRequestId(id, fn)`; `getRequestId()` reads it from anywhere. The logger reads it
  internally on every call, so call sites never pass `requestId` explicitly — `logger.info('bid_placed', { auctionId, amountCOP })`
  is enough, and the line still comes out correlated.
- **The `Logger` is dependency-injected into services/scheduler, exactly like `EventBus` already
  is** (`bid.service.ts`, `publish-scheduler.ts` already take an injected `eventBus`; this adds a
  `logger` alongside it). This keeps business-logic tests isolated from real file I/O — tests use a
  `FakeLogger` that records calls, the same pattern already established for `FakeEventBus`
  throughout specs 007/008. `container.ts` builds exactly one real logger instance and injects it
  everywhere, so there's a single file handle, never two writers racing on the same path.
- **`create-app.ts` takes an optional `logger`, defaulting to a `NOOP_LOGGER`** — the same
  optional-collaborator-with-a-safe-default shape already used for `authRateLimiter`/
  `auctionRateLimiter`. Defaulting to a no-op (not a real file-writing logger) means the existing
  `create-app.test.ts` suite keeps working unchanged and never pollutes a real log file; only
  `index.ts` (the composition root) wires in the real one.
- **Request ID reuses the existing `createPrefixed Id` convention** (`BID-`, `AUC-`, `USR-`,
  `NTF-` already exist) — a new `REQ-` prefix for HTTP requests, `TICK-` for scheduler ticks,
  `WS-` for realtime messages. One consistent ID shape everywhere.
- **HTTP-level tracing needs no changes to `asyncHandler` or any route file.** A new
  `middlewares/request-logging.ts`, mounted once in `create-app.ts` right after `cookieParser()`
  (before any router), generates the request ID, opens the `AsyncLocalStorage` scope for the whole
  request, and logs one `http_request` line on `res.on('finish')` with method/path/status/
  durationMs — status ≥500 logged as `critical`, ≥400 as `warning`, else `info`. Because every
  downstream service call happens inside that same async context, an unexpected error thrown deep
  in a service still surfaces as a correlated `critical http_request` line without touching
  `asyncHandler`'s existing `console.error` fallback (left as-is — a last-resort catch, not the
  primary traceability path anymore).
- **Errors are captured everywhere they can happen, not only on the HTTP path.** Four capture
  points, so no failure goes unlogged:
  1. `lib/async-handler.ts` — its existing bare `console.error('Unexpected route error', error)` is
     replaced with `logger.critical('unexpected_route_error', { message, stack, route })`, keeping
     the same 500 response. Since it runs inside the request's `AsyncLocalStorage` scope, the line
     is automatically correlated to the same `REQ-…` id as the `http_request` line.
  2. Expected domain failures (`HttpError` — a rejected bid, a 404, a validation error) are logged
     as `warning`, not `error`: they are normal outcomes worth tracing, not defects. Only
     unexpected throws get `error`/`critical`.
  3. Background failures where there's no request to fail — scheduler ticks, event-bus listeners,
     realtime pushes — get `logger.critical`/`logger.error` at their existing catch sites (PR 2),
     replacing the four remaining `console.error` calls.
  4. `apps/api/src/index.ts` installs `process.on('uncaughtException')` /
     `process.on('unhandledRejection')` handlers that log `uncaught_exception` /
     `unhandled_rejection` (critical, with message + stack) and flush the log stream before
     exiting — today these crash the process silently with nothing written down.
     `logger.time(...)`'s failure branch also logs the caught error's message automatically, so any
     instrumented operation records its own failure without an extra try/catch.
- **Every log line carries `memoryUsedMb` for free** (`process.memoryUsage().rss` at write time) —
  satisfies "memoria usada" as an ambient metric correlated with whatever was happening, no
  separate sampler needed. A cheap periodic `system_heartbeat` (PR 2) covers idle-time monitoring.
- **Execution timing is a logger primitive, not boilerplate at each call site.** `logger.time(event, fields, fn)`
  measures an async function, logs `info` + `outcome: 'success'` + `durationMs` on success, or
  `error` + `outcome: 'failure'` + `durationMs` + the caught error's message on failure, and
  rethrows — one call replaces manual try/catch/timer boilerplate at each of PR 2's instrumentation
  points.
- **Event names are validated, not just documented.** `logger` throws if an `event` string doesn't
  match `^[a-z][a-z0-9]*(_[a-z0-9]+)*$` — cheap, testable, and keeps the convention from drifting
  as more events get added later.
- **The log viewer is a standalone dev script, not a page in the real app.** `apps/web` has no
  admin/internal-page precedent, and bolting one on would tangle it with the deployed SPA's
  auth/build story for a tool that's explicitly local-only. Following the `scripts/seed.ts` /
  `scripts/bot.ts` precedent (AGENTS.md: dev tooling isn't spec-gated), a new
  `apps/api/scripts/log-viewer.ts` starts its own tiny Express server (Express is already a
  dependency — no new deps) on its own port, serving one self-contained HTML page with a
  live-polling table (level color-coded, click a request ID to filter everything else to that
  transaction, free-text search, level/event filters). No auth — same trust model as `seed`/`bot`,
  local dev use only.
- **No log rotation.** A single growing `data/logs/app.jsonl` (same gitignored directory as the
  rest of `data/`, no new `.gitignore` entry needed) is accepted as a scaling wall, exactly like
  the JSON-file-store's own documented whole-array-rewrite limitation — reasonable at this app's
  size, called out as a non-goal.

## Files

Docs first, per SDD: `docs/009-observability/{spec.md, plan.md, tasks.md}`.

### PR 1 — `feat/009-logging-core`

- **`apps/api/src/lib/request-context.ts`** (new) — `AsyncLocalStorage<{ requestId: string }>`
  wrapped in `runWithRequestId(requestId, fn)` / `getRequestId(): string | undefined`.
- **`apps/api/src/lib/logger.ts`** (new):
  ```ts
  export type LogLevel = 'info' | 'warning' | 'error' | 'critical';
  export interface Logger {
    info(event: string, fields?: Record<string, unknown>): void;
    warning(event: string, fields?: Record<string, unknown>): void;
    error(event: string, fields?: Record<string, unknown>): void;
    critical(event: string, fields?: Record<string, unknown>): void;
    time<T>(event: string, fields: Record<string, unknown>, fn: () => Promise<T>): Promise<T>;
    close(): Promise<void>;
  }
  export function createLogger(filePath: string): Logger; // real JSONL writer
  export const NOOP_LOGGER: Logger; // safe default, does nothing
  ```
  Validates `event` against the snake_case pattern (throws on violation). Each real write is one
  JSON object + `\n` appended via a persistent `fs.createWriteStream(path, { flags: 'a' })`
  (created once, directory `mkdirSync`'d recursively up front — mirrors `json-file-store.ts`'s
  existing `mkdir` step, but a single open stream instead of read-modify-write per call, since this
  is append-only high-frequency traffic, not the JSON "table" pattern). Every entry:
  `{ timestamp, level, event, requestId (from context, if any), pid, memoryUsedMb, ...fields }`.
- **`apps/api/src/middlewares/request-logging.ts`** (new) — `createRequestLoggingMiddleware(logger)`
  as described above; co-located test using `supertest` + a `FakeLogger`.
- **`apps/api/src/create-app.ts`** — `CreateAppOptions.logger?: Logger` (default `NOOP_LOGGER`),
  mount the new middleware right after `cookieParser()`.
- **`apps/api/src/container.ts`** — build the one real `createLogger(path)` instance, add `logger`
  to `Container`.
- **`apps/api/src/index.ts`** — `uncaughtException` / `unhandledRejection` handlers logging
  `uncaught_exception` / `unhandled_rejection` (critical, message + stack) and flushing via
  `logger.close()` before exit; compute the log file path (`join(dataDir, 'logs', 'app.jsonl')`,
  same `dataDir` already used for the JSON stores), pass `logger` into `createServer`/`createApp`.
- **`apps/api/src/lib/async-handler.ts`** — takes the logger (via a small
  `createAsyncHandler(logger)` factory, keeping the current bare `asyncHandler` export as the
  no-op-logger default so route files need no change); logs `unexpected_route_error` as `critical`
  with message + stack instead of `console.error`.
- **`apps/api/src/create-server.ts`** — thread `logger` through to `createApp` (and, in PR 2, to
  the scheduler/realtime wiring it already does for `eventBus`).
- **`apps/api/scripts/log-viewer.ts`** (new, dev tooling, not spec-gated) — reads
  `data/logs/app.jsonl`, serves the filterable/live-polling HTML page + a `GET /api/logs` JSON
  endpoint. New `apps/api/package.json` script: `"logs": "tsx scripts/log-viewer.ts"`.

### PR 2 — `feat/009-logging-instrumentation`

- **`apps/api/src/services/bid.service.ts`** — `createBidService` takes a 6th arg, `logger`.
  `placeBid` logs `bid_placed` (info: auctionId, bidderId, amountCOP, bidCount) on success and
  `bid_rejected` (warning: auctionId, bidderId, attemptedAmount, reason = the `HttpError`'s
  message) on an expected validation failure, via one wrapping try/catch around the existing
  mutex-protected block — no change to the method's public return shape or the existing
  `bid-placed` domain event.
- **`apps/api/src/services/notification.service.ts`** — `createNotificationService` takes a 3rd
  arg, `logger`. Logs `notification_created` (info) per saved notification, `notification_skipped`
  (info: reason `'preference_disabled'`) where a recipient's toggle was off — today this path is
  silent — and `notification_mark_read_failed` (warning) on the existing 404 case.
- **`apps/api/src/lib/publish-scheduler.ts`** — `closeDueAuctions`/`startAuctionScheduler` take a
  `logger` arg; each tick runs inside `runWithRequestId(createPrefixedId('TICK'), ...)` so a tick's
  cascade of closes/notifications/broadcasts share one id. Logs `auction_published`/
  `auction_closed` (info) and replaces the two existing `console.error` scheduler-tick-failure
  sites with `logger.critical('scheduler_tick_failed', ...)`.
- **`apps/api/src/lib/event-bus.ts`** — `createEventBus` takes a `logger` arg; replaces its
  `console.error` with `logger.error('event_listener_failed', ...)`.
- **`apps/api/src/realtime/event-fanout.ts`** — takes `logger`; replaces its `console.error` with
  `logger.error('notification_push_failed', ...)`.
- **`apps/api/src/realtime/realtime-server.ts`** / **`authenticate-upgrade.ts`** — takes `logger`;
  each inbound WS message is wrapped in `runWithRequestId(createPrefixedId('WS'), ...)`; logs
  `ws_connection_opened`/`ws_connection_closed` (info), `ws_upgrade_rejected` (warning: reason),
  `ws_message_invalid` (warning), `ws_rate_limited` (warning).
- **`apps/api/src/index.ts`** — a `system_heartbeat` (info: memoryUsedMb, uptime) on a 5-minute
  interval, for baseline visibility even with no traffic.
- **`apps/api/src/container.ts`** — thread `logger` into every factory call above.

## Verification

Automated (co-located `*.test.ts`, TDD throughout):

- `request-context.test.ts` — value set inside `runWithRequestId` is readable via `getRequestId()`
  inside (including across an `await`), undefined outside, nested calls don't leak into each other.
- `logger.test.ts` — each level method appends one correctly-shaped JSON line to a temp file
  (`mkdtemp`, matching every other JSON-repository test's pattern); `time()` logs success/failure
  with `durationMs` and rethrows on failure; invalid event names throw; `requestId` is included
  when a context is active and omitted otherwise; `NOOP_LOGGER` does nothing and never throws.
- `request-logging.test.ts` — `supertest` + a dummy route + a `FakeLogger`: asserts one
  `http_request` line per request with the right level for 2xx/4xx/5xx, and that `getRequestId()`
  inside the dummy route handler returns a value.
- `bid.service.test.ts`, `notification.service.test.ts`, `publish-scheduler.test.ts`,
  `event-bus.test.ts`, `event-fanout.test.ts`, `realtime-server.test.ts` — extended with a
  `FakeLogger` (same shape as the existing `FakeEventBus`) asserting the right event/level fires on
  each success and failure path.
- `async-handler.test.ts` — a route that throws a non-`HttpError` produces exactly one `critical`
  `unexpected_route_error` line carrying the error message, still responds 500, and one that throws
  an `HttpError` does not log at that level.
- `create-app.test.ts` — confirms the default `NOOP_LOGGER` requires no changes to existing tests,
  plus one new test passing a `FakeLogger` and asserting an `http_request` line on a real request.

Manual, against the running dev servers:

1. Hit a few endpoints (browse auctions, log in, place a bid, trigger a 404, a validation 400, and
   a rejected bid below the minimum) →
   run `npm run logs --workspace=apps/api`, open the printed URL, confirm one row per request with
   the right color per level, and that clicking a request ID filters to every line from that
   transaction (the `http_request` line plus any `bid_placed`/`bid_rejected` line it produced).
2. Let the scheduler close a due auction → confirm `auction_closed` and the resulting
   `notification_created` share one `TICK-…` request ID in the viewer.
3. Temporarily make one route throw a raw `Error` → confirm a `critical unexpected_route_error`
   line with a readable stack, correlated to the same request ID as its `http_request` 500 line;
   revert the throw afterwards.
4. Kill and restart the API mid-session (already done for spec 008 testing) → confirm no crash from
   the log file already existing, and that new lines keep appending after restart.
