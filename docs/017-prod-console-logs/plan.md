# 017 — Plan: Logger console output in production

## Approach

`createLogger(filePath)` branches on `process.env.NODE_ENV === 'production'` at creation time. In prod mode, skip `mkdirSync`/`createWriteStream` entirely and set `write()` to `console.log(JSON.stringify(entry))` instead of `stream.write(...)`. `close()` becomes a no-op in prod mode (nothing to flush/end). File-mode path stays byte-for-byte the same as today.

`filePath` param and callsite in `container.ts` stay unchanged — the branch lives inside `createLogger`, not at the callsite, so prod detection is one place.

## Key decisions

- Decision: branch inside `createLogger` rather than at the `container.ts` callsite — Rationale: keeps the env check in one place, callers don't need to know about it, matches how `NOOP_LOGGER` is already a self-contained alternate implementation.
- Decision: reuse `buildEntry()` unchanged for both modes — Rationale: identical JSON shape means the local log viewer's parsing logic and any future prod log parsing stay compatible.
- Decision: `console.log` for all levels (not `console.error` for error/critical) — Rationale: keeps a single ordered stream, matches today's single-file-stream behavior; Render captures both stdout and stderr into the same log view anyway.

## Affected areas

- `apps/api/src/lib/logger.ts` — `createLogger` gains the prod/file branch.
- `apps/api/src/lib/logger.test.ts` — new test cases for prod-mode console output and for file mode being skipped when `NODE_ENV=production`.

## Risks

- Tests that set `NODE_ENV=production` globally (e.g. e2e prod-server tests) could accidentally lose log file output if any of them relied on reading `app.jsonl` — checked: no existing test reads the log file, so no regression expected.
- Mocking `console.log` incorrectly could leak into other test output — mitigate with `vi.spyOn(console, 'log').mockImplementation(() => {})` and restore in `afterEach`.

## Test strategy

Strict TDD: write failing tests first in `logger.test.ts`, then implement.

- Test: `NODE_ENV=production` → `createLogger` writes JSON line to `console.log`, does not call `createWriteStream`/create the log file.
- Test: `NODE_ENV` unset/other → unchanged, still writes to file (existing tests already cover this — verify they still pass).
- Test: `close()` resolves without throwing in prod mode.
- Run `npm run test --workspace=apps/api` after each red/green step.
