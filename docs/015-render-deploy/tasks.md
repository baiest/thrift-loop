# 015 — Tasks: Deploy to Render

- [x] Add `nixpacks.toml` at repo root pinning install/build/start commands (kept from Railway attempt, unused by Render but harmless).
- [ ] Create Render account/login (no card required for free tier).
- [ ] New → Web Service → connect GitHub repo `thrift-loop`, branch `feat/photo-carousel` (or main after merge).
- [x] Set Build Command: `npm ci --include=dev && npm run build:shared && npm run build --workspace=apps/web && npm run build --workspace=apps/api` (`--include=dev` needed: Render's `NODE_ENV=production` makes plain `npm ci` skip devDependencies, which vite/tsc are)
- [ ] Set Start Command: `npm run start --workspace=apps/api`
- [ ] Set env vars: `JWT_SECRET`, `NODE_ENV=production`, `WEB_DIST_PATH=../web/dist`, `ALLOWED_ORIGINS=<render-assigned-domain>` (fill in once domain is issued).
- [x] Fix `prepare` script (`husky`) failing on Render build: `npm ci` skips devDependencies when `NODE_ENV=production`, so the husky binary isn't there when `prepare` tries to run it. Make it tolerant of that (`husky || true`).
- [ ] Deploy, confirm build succeeds and service boots.
- [ ] Verify SPA loads at the Render URL and `/api/*` responds.
- [ ] Manually verify: register user → create auction w/ photo → place bid → notification fires (WebSocket).
- [ ] Document the deploy steps and the no-persistence caveat in README.md or this docs folder.
- [x] Fix `express-rate-limit` `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` at boot: Render sits one
      reverse-proxy hop in front, so `app.set('trust proxy', 1)` is required for the rate
      limiter to read the real client IP from `X-Forwarded-For` (`create-app.ts`)
