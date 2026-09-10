# Tasks — PR1: core logger, request correlation, HTTP tracing, viewer

TDD throughout: write the failing test first, confirm it fails for the right reason, then write
the minimal code to pass.

## `lib/request-context.ts`

- [ ] Test: value set inside `runWithRequestId(id, fn)` is readable via `getRequestId()` inside
      `fn`, including after an `await`.
- [ ] Test: `getRequestId()` returns `undefined` outside any `runWithRequestId` call.
- [ ] Test: nested/sibling `runWithRequestId` calls don't leak their id into each other.
- [ ] Implement with `node:async_hooks`'s `AsyncLocalStorage`.

## `lib/logger.ts`

- [ ] Test: `info`/`warning`/`error`/`critical` each append one JSON line to the target file with
      the right `level`/`event`/fields.
- [ ] Test: an entry includes `timestamp`, `pid`, `memoryUsedMb` on every call.
- [ ] Test: an entry includes `requestId` when called inside `runWithRequestId`, omits it otherwise.
- [ ] Test: an invalid event name (not `snake_case`) throws before writing anything.
- [ ] Test: `time(event, fields, fn)` logs `info` + `outcome: 'success'` + `durationMs` and returns
      `fn`'s resolved value on success.
- [ ] Test: `time(...)` logs `error` + `outcome: 'failure'` + `durationMs` + the caught error's
      message, then rethrows, on failure.
- [ ] Test: `NOOP_LOGGER`'s methods do nothing and never throw, including on an invalid event name.
- [ ] Implement `createLogger(filePath)` (creates the directory, opens one persistent append
      write stream) and `NOOP_LOGGER`.

## `middlewares/request-logging.ts`

- [ ] Test (supertest + `FakeLogger` + a dummy route): a 200 response logs one `http_request` line
      at `info` with method/path/status/durationMs.
- [ ] Test: a 4xx response logs at `warning`; a 5xx response logs at `critical`.
- [ ] Test: `getRequestId()` inside the dummy route handler returns a value.
- [ ] Test: a client that disconnects before a response is sent logs `http_request_aborted`
      (warning) instead of a status-coded `http_request` line.
- [ ] Implement, mounted in `create-app.ts` right after `cookieParser()`.

## `lib/async-handler.ts`

- [ ] Test: a route that throws a non-`HttpError` logs one `critical` `unexpected_route_error` line
      (message + stack) via the injected logger and still responds 500.
- [ ] Test: a route that throws an `HttpError` does not produce a `critical` log line.
- [ ] Implement `createAsyncHandler(logger)`; keep the existing `asyncHandler` export wired to
      `NOOP_LOGGER` as the default so route files need no changes.

## Wiring

- [ ] `create-app.ts`: add optional `logger` (default `NOOP_LOGGER`) to `CreateAppOptions`; mount
      the request-logging middleware; pass `logger` into `createAsyncHandler`.
- [ ] Test: `create-app.test.ts` — a `FakeLogger` passed in records an `http_request` line for a
      real request; the existing suite (no logger passed) is unaffected.
- [ ] `container.ts`: build the one real `createLogger(path)` instance.
- [ ] `create-server.ts`: thread `logger` through to `createApp`.
- [ ] `index.ts`: compute `data/logs/app.jsonl` path, wire the real logger in; add
      `process.on('uncaughtException'/'unhandledRejection')` handlers that log `critical` and flush
      via `logger.close()` before exit.

## Log viewer

- [ ] `apps/api/scripts/log-viewer.ts`: standalone Express server (dev tooling, not spec-gated per
      AGENTS.md) reading `data/logs/app.jsonl`, serving a filterable/live-polling HTML page and a
      `GET /api/logs` JSON endpoint.
- [ ] `apps/api/package.json`: add `"logs": "tsx scripts/log-viewer.ts"`.

## Verification

- [ ] `npm run verify` green across all workspaces.
- [ ] Manual: hit a few endpoints, run `npm run logs`, confirm entries appear, level colors are
      correct, and clicking a request ID filters to that transaction.
- [ ] Manual: temporarily throw a raw `Error` in a route, confirm a correlated `critical
unexpected_route_error` line with a readable stack; revert the throw.
