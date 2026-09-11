# 017 — Tasks: Logger console output in production

- [x] Write failing test: `NODE_ENV=production` → entry logged via `console.log` as JSON, `data/logs/app.jsonl` not created/written.
- [x] Write failing test: `close()` resolves without error in prod mode.
- [x] Confirm existing file-mode tests still pass unmodified (baseline, no `NODE_ENV=production`).
- [x] Implement prod/file branch in `createLogger` (`apps/api/src/lib/logger.ts`).
- [x] Run `npm run test --workspace=apps/api` — all green.
- [x] Run `npm run verify` — all green.
- [ ] Open PR from `feat/prod-console-logs` into `main`.
