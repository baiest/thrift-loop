# 015 — Plan: Deploy to Render

## Approach

Single Render Web Service (Node runtime, native build not Docker) running `apps/api`, which serves the built `apps/web` SPA as static files via existing `WEB_DIST_PATH` support. Reuses the local-prod path already proven by `npm run e2e:server`. Build/start commands mirror `nixpacks.toml` (Railway config stays in repo, unused by Render — harmless) but entered directly in Render's dashboard since Render doesn't read nixpacks.toml.

No volume: Render free tier doesn't offer persistent disks, so `data/` (json store + uploads + logs) lives on the container's local, ephemeral fs. Accepted per spec — this deploy is for demoing the live app, not for keeping real user data long-term.

## Key decisions

- Decision: Render Web Service over Railway — Rationale: Railway trial expired and requires a card; Render's free tier needs no card.
- Decision: no persistent volume — Rationale: not available on Render free tier; explicitly accepted as out of scope in spec.
- Decision: single service (api serves web dist) — Rationale: same as original plan, avoids CORS/second-service complexity, zero code change.

## Affected areas

- Render dashboard config (build/start commands, env vars) — not app code.
- `docs/015-render-deploy/` — this doc set, plus a short deploy section added to README.md.
- `nixpacks.toml` (existing, from the Railway attempt) — left in repo unused; harmless, no action needed.

## Risks

- Free service spins down after inactivity; first request after sleep is slow (cold start) — acceptable for a demo.
- Data loss on every redeploy/restart — acceptable per spec; call this out clearly to the user before showing the live link so expectations are set.
- `ALLOWED_ORIGINS` mismatch blocks the realtime WebSocket silently — mitigate by setting it explicitly to the Render-issued domain and testing bidding/notifications live.

## Test strategy

Not unit-testable (infra config). Verification is manual against the deployed URL per spec acceptance criteria: register → create auction w/ photo → bid, all within one running instance. Existing test suite (`npm run verify`) must still pass locally before deploying, unchanged.
