# 009 — Observability: structured logging and a local log viewer

## Problem

The backend has no real logging: six scattered `console.error`/`console.log` calls are the only
trace of what happened, none of them structured, none correlated to the transaction that caused
them. Debugging "why was this bid rejected" or "why did this notification never arrive" today means
reading raw stdout with no way to tie the pieces together, and there is zero visibility into
timing, memory, or system errors. Uncaught exceptions crash the process silently with nothing
written down.

## Goals

- A logger service producing structured, correlated log entries for every transaction (HTTP
  request, scheduler tick, WebSocket message) and every error (expected or unexpected).
- Each entry has a `snake_case` event name, a level (`info`/`warning`/`error`/`critical`), a request
  ID linking every line of one transaction, and useful business context (bid id, user id, auction
  id, amounts, etc.).
- Metrics on every entry: memory used, and duration for measured operations.
- Output as JSONL, append-only, to a local file.
- A simple local web page to browse, filter, and correlate the logs — no external tooling.

## Non-goals

- No log rotation, retention policy, or shipping to an external system (Datadog, ELK, etc.) — a
  single growing local file is accepted as a known scaling wall.
- No distributed tracing across processes/instances — this is a single-process app.
- No authentication on the log viewer — it is a local dev tool, same trust model as `scripts/seed.ts`
  and `scripts/bot.ts`.
- No change to any business logic's behavior or return values — this spec only adds observability
  around existing code paths.

## Acceptance criteria

### Backend — core logger (PR1)

- [ ] A `Logger` (`apps/api/src/lib/logger.ts`) exposes `info`/`warning`/`error`/`critical(event,
  fields?)` and a `time(event, fields, fn)` helper that measures an async function and logs its
      outcome (success or failure) with duration.
- [ ] Every real log entry is one JSON object per line, appended to `apps/api/data/logs/app.jsonl`,
      containing at least: `timestamp`, `level`, `event`, `requestId` (when a request context is
      active), `pid`, `memoryUsedMb`, plus caller-supplied fields.
- [ ] An invalid (non-`snake_case`) event name throws.
- [ ] A request ID (`AsyncLocalStorage`-based, `apps/api/src/lib/request-context.ts`) is generated
      once per HTTP request/scheduler tick/WS message and automatically attached to every log line
      produced while handling it, without being passed explicitly through function signatures.
- [ ] Every HTTP request produces one `http_request` log line (method, path, status, durationMs),
      leveled `info`/`warning`/`critical` by status code.
- [ ] An unexpected error in a route handler is logged `critical` with the error's message and
      stack, correlated to the same request ID as its `http_request` line.
- [ ] `create-app.ts`'s `logger` option defaults to a no-op logger, so existing tests are unaffected
      and no test run writes to the real log file.

### Backend — instrumentation (PR2)

- [ ] Placing a bid logs `bid_placed` (info) on success or `bid_rejected` (warning, with the
      rejection reason) on an expected validation failure.
- [ ] Creating/skipping a notification logs `notification_created` or `notification_skipped` (info).
- [ ] Each scheduler tick's auction publish/close actions log `auction_published`/`auction_closed`
      (info), and a scheduler failure logs `scheduler_tick_failed` (critical) — replacing its
      existing bare `console.error`.
- [ ] Event-bus listener failures and realtime push failures are logged (`error`) — replacing their
      existing bare `console.error` calls.
- [ ] A WebSocket connection's open/close/reject/invalid-message events are logged, correlated by a
      per-message request ID.
- [ ] An uncaught exception or unhandled rejection at the process level is logged `critical` (with
      message and stack) and the log file is flushed before the process exits.

### Log viewer

- [ ] A local dev script (`npm run logs` in `apps/api`) serves a single web page showing log entries
      newest-first, color-coded by level, live-updating.
- [ ] The viewer supports filtering by level and by event, free-text search, and clicking a request
      ID to show only that transaction's lines.

## Open questions

- None blocking approval.
