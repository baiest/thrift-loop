# 001 — Plan

## Approach

Layered backend (`routes → services → repositories`, per `AGENTS.md`) and 3-tier Atomic Design
frontend, both scaffolded for the first time as part of this feature. Validation rules that must
match on both ends (phone format, password policy, city list) live once in `packages/shared` and
are imported by both `apps/api` and `apps/web`, so there is one source of truth.

## Key decisions

- **Session = JWT in an httpOnly cookie**, not a token returned to JS. The frontend never reads
  or stores the token; it only reads the `PublicUser` JSON returned alongside it. Rationale: the
  user explicitly asked for a cookie-based session; httpOnly protects the token from XSS.
- **Password hashing: `bcryptjs`**, not native `bcrypt`. Pure JS, no node-gyp/native build step,
  avoids Windows dev-machine friction. Fixed salt rounds constant (`SALT_ROUNDS = 10`).
- **`JWT_SECRET` is required, no fallback.** The app throws on startup if it's missing. A
  hardcoded fallback secret would itself be the kind of security issue `AGENTS.md` says to stop
  and flag — so it's simply not an option here.
- **Storage: JSON file** (`apps/api/data/users.json`, gitignored), behind a `UserRepository`
  interface. Swapping to MongoDB later means a new `createMongoUserRepository(...)` factory
  function satisfying the same interface and a one-line change in `container.ts` — `services/`
  never changes. (Repositories and services are factory functions, not classes — see AGENTS.md.)
- **City list**: a fixed, curated `COLOMBIA_CITIES` array in `packages/shared` (32 department
  capitals + Bogotá D.C.). Validated identically on both ends. Extending to another country later
  means adding another list and a `country` field the schema already carries.
- **Login error is intentionally generic** ("phone number or password is incorrect") to avoid
  leaking which phone numbers are registered (user enumeration).
- **Routing**: `react-router-dom` is a new dependency for `apps/web` (two pages: register, login;
  a minimal placeholder "home" to redirect to after login). This is the smallest reasonable
  choice — no state-machine router library needed for two screens.
- **Single origin in production**: `apps/api` serves both `/api/*` and the built SPA (static
  files + fallback to `index.html`). No CORS anywhere, dev or prod — Vite's dev server proxies
  `/api` to the API so the browser sees one origin even locally. See "Deployment" below for why
  this replaced the original two-origin design.

## Data model

```ts
// apps/api/src/models/user.ts
interface User {
  id: string; // uuid
  phone: string; // "3xxxxxxxxx", unique
  firstName: string;
  lastName: string;
  city: string; // one of COLOMBIA_CITIES
  country: 'CO'; // hardcoded today, ready for expansion later
  passwordHash: string;
  createdAt: string; // ISO timestamp
}

// packages/shared/src/user.ts
interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  country: 'CO';
}
```

## API contract

`POST /api/auth/register`

- Body: `{ phone, firstName, lastName, city, password, confirmPassword }`
- 201: `{ user: PublicUser }`, `Set-Cookie: session=<jwt>; HttpOnly; SameSite=Strict[; Secure]`
- 400: `{ error: string, fields: Record<string, string> }` — one message per invalid field
- 409: `{ error: string }` — phone already registered

`POST /api/auth/login`

- Body: `{ phone, password }`
- 200: `{ user: PublicUser }`, sets the same session cookie
- 401: `{ error: "Phone number or password is incorrect" }` — for both unknown phone and wrong
  password

`POST /api/auth/logout`

- 204, clears the session cookie. Necessary companion to a cookie-based session — without it a
  user could never sign out. Included as infrastructure, not a new user-facing feature.

`GET /api/auth/me`

- Reads the session cookie. 200 `{ user: PublicUser }` if valid, 401 `{ error: string }` if not.
  Lets the frontend know on page load whether a session already exists.

All four routes live under `/api/auth`, not `/auth` — see "Deployment" below.

## Affected areas (new)

- `packages/shared/src/{colombia-cities,phone,password-policy,user}.ts`
- `apps/api/src/{models,repositories,services,routes,lib,middlewares}/*`, `container.ts`,
  `create-app.ts`, `index.ts`, `.env.example`
- `apps/web/src/{components/{atoms,molecules,organisms},pages,stores,lib,assets}/*`,
  `vite.config.ts` (dev proxy)

## Deployment

Single Railway service, not two. `apps/api` serves everything:

- Routes under `/api/*` — unchanged behavior, just remounted (`app.use('/api/auth', ...)`
  instead of `app.use('/auth', ...)` in `create-app.ts`).
- Everything else: `express.static(webDistPath)` plus a catch-all `GET` (excluding `/api/*`) that
  serves `index.html`, so React Router's client-side routes work on a hard refresh. `webDistPath`
  is an optional `createApp(...)` parameter — omitted in every test, so tests are unaffected; set
  from a `WEB_DIST_PATH` env var (default `../web/dist`, relative to `apps/api`) in `index.ts`.

Build command (Railway or local): `npm run build` at the repo root — builds `packages/shared`,
then `apps/api` (tsc) and `apps/web` (vite build) via the existing workspace build script. Start
command: run `apps/api`'s compiled `dist/index.js` (`node apps/api/dist/index.js`, or
`npm run start --workspace=apps/api`). No Railway config files are added in this PR — this is the
shape the service needs, not the deploy configuration itself, since that wasn't asked for.

Was originally two services (see git history) — CORS with `credentials: true` and an explicit
`CORS_ORIGIN`. Changed to single-origin after realizing that setup has a real bug: the session
cookie was `SameSite=Lax`, and a `Lax` cookie is not sent on cross-site `fetch`/XHR requests
(only top-level GET navigation). Two different Railway subdomains are cross-site to the browser,
so login would set the cookie but the next `fetch('/auth/me', {credentials:'include'})` would
never send it back — working locally (same-site on `localhost`), silently broken in production.
Single origin removes the failure mode entirely and allows `SameSite=Strict`.

## Risks

- **Brute-force login attempts**: initially accepted as a non-goal, but CodeQL's default code
  scanning flagged the unthrottled `/register`, `/login`, and `/me` handlers as a real
  high-severity finding on the PR. Mitigated with `express-rate-limit` on the whole `/api/auth`
  router (`middlewares/rate-limit.ts`, 20 requests / 15 min per IP by default, injectable for
  tests).

## Test strategy (TDD)

- `packages/shared`: one `*.test.ts` per validator, table-driven over valid/invalid inputs.
- `apps/api`: `auth.service.test.ts` against an in-memory fake `UserRepository` — no real file
  I/O, covers every acceptance criterion above as a case. `auth.routes.test.ts` (supertest)
  covers HTTP status codes, cookie flags, and that no response body ever contains `passwordHash`.
- `apps/web`: component tests for `PasswordInput` (toggle), `PasswordStrengthMeter` (score
  buckets), `FieldError` (renders/doesn't), `SearchableSelect` (filters, only accepts list
  members), and `RegisterForm`/`LoginForm` (client-side validation messages, submit wiring).
