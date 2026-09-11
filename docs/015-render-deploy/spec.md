# 015 — Deploy to Render

## Problem

thrift-loop runs local only. No path to a public URL. Railway's free trial expired (needs a card to continue). App wants live on Render (free tier, no card required), single service.

## Goals

- One Render Web Service serves `apps/api` (Express) which itself serves built `apps/web` (SPA) as static + fallback — matches existing `WEB_DIST_PATH` design, no separate web service needed.
- Required env vars set in Render (JWT_SECRET, NODE_ENV=production, ALLOWED_ORIGINS matching the Render-assigned domain, WEB_DIST_PATH).
- Documented, repeatable deploy (build command, start command, env vars) — not a one-off manual fix.

## Non-goals

- Data persistence across redeploys/restarts. Render's free tier has no persistent disk — `data/` (json repos, `uploads/`, `logs/`) resets on every redeploy and on every restart after the free service spins down from inactivity. Accepted tradeoff for a free demo deploy; not solved by this spec.
- Migrating json-file storage to a real DB (Postgres etc.) — out of scope.
- CI/CD auto-deploy config beyond Render's default git-push deploy.
- Multi-service split (api/web separate services) — current single-service static-serve design stays.
- Custom domain setup.

## Acceptance criteria

- [ ] Render build produces `apps/web/dist` and `apps/api/dist` and the service boots via `npm run start --workspace=apps/api`.
- [ ] Visiting the Render-assigned URL serves the SPA; API routes under `/api` respond.
- [ ] JWT_SECRET, ALLOWED_ORIGINS (set to the Render public URL), WEB_DIST_PATH, NODE_ENV=production are set as Render env vars — no secrets committed to the repo.
- [ ] Registering a user, creating an auction with a photo, and placing a bid works end-to-end against the deployed URL (within one running instance — no redeploy/restart persistence expected).
- [ ] Deploy steps are written down in `docs/015-render-deploy/plan.md` / a README section so it's repeatable without re-deriving from scratch.

## Open questions

- None blocking — data-loss-on-restart tradeoff explicitly accepted by user in favor of a free, no-card deploy.
