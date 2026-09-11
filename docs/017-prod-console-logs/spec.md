# 017 — Logger: console output in production

## Problem

`createLogger` (`apps/api/src/lib/logger.ts`) always writes to `data/logs/app.jsonl`. On Render, `data/` is ephemeral (spec 015) — the file resets on every restart/redeploy, and Render's own log capture only sees stdout/stderr, not the file. Prod log entries are effectively invisible in Render's dashboard.

## Goals

- In production (`NODE_ENV=production`), log entries go to the console (stdout for `info`/`warning`, matching current single-stream write; keep to one stream to preserve existing entry ordering) as one JSON line per entry — same shape `buildEntry` already produces, so any tool that parses `app.jsonl` today also parses stdout.
- Non-production behavior (local dev, tests) is unchanged: writes to `data/logs/app.jsonl` exactly as today, so `npm run logs` (the local log viewer) keeps working.
- `close()` remains safe to call in both modes (no dangling file handle in prod; no-op is fine since there's no stream).

## Non-goals

- Changing the local log viewer (`apps/api/scripts/log-viewer.ts`) — out of scope, still reads the local file, still dev-only.
- Structured log shipping to an external service (Datadog, Grafana, etc.) — out of scope, plain stdout is enough for Render's built-in log capture.
- Changing log levels, event validation, or the `time()` helper's behavior — only the write destination changes.

## Acceptance criteria

- [ ] With `NODE_ENV=production`, `createLogger` writes each entry as a JSON line to `console.log` and never creates/writes `data/logs/app.jsonl`.
- [ ] With `NODE_ENV` unset or any other value, `createLogger` writes to `data/logs/app.jsonl` exactly as before (no behavior change, existing tests keep passing).
- [ ] `close()` resolves without error in both modes.
- [ ] Existing `logger.test.ts` coverage for file-mode behavior is untouched/still passes; new tests cover the console-mode branch.

## Open questions

- None blocking — env detection confirmed as `process.env.NODE_ENV === 'production'`, format confirmed as one-line JSON (same as file mode).
