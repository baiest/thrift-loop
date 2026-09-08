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
  interface. Swapping to MongoDB later means a new class implementing the same interface and a
  one-line change in `container.ts` — `services/` never changes.
- **City list**: a fixed, curated `COLOMBIA_CITIES` array in `packages/shared` (32 department
  capitals + Bogotá D.C.). Validated identically on both ends. Extending to another country later
  means adding another list and a `country` field the schema already carries.
- **Login error is intentionally generic** ("phone number or password is incorrect") to avoid
  leaking which phone numbers are registered (user enumeration).
- **Routing**: `react-router-dom` is a new dependency for `apps/web` (two pages: register, login;
  a minimal placeholder "home" to redirect to after login). This is the smallest reasonable
  choice — no state-machine router library needed for two screens.

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

`POST /auth/register`

- Body: `{ phone, firstName, lastName, city, password, confirmPassword }`
- 201: `{ user: PublicUser }`, `Set-Cookie: session=<jwt>; HttpOnly; SameSite=Lax[; Secure]`
- 400: `{ error: string, fields: Record<string, string> }` — one message per invalid field
- 409: `{ error: string }` — phone already registered

`POST /auth/login`

- Body: `{ phone, password }`
- 200: `{ user: PublicUser }`, sets the same session cookie
- 401: `{ error: "Phone number or password is incorrect" }` — for both unknown phone and wrong
  password

`POST /auth/logout`

- 204, clears the session cookie. Necessary companion to a cookie-based session — without it a
  user could never sign out. Included as infrastructure, not a new user-facing feature.

`GET /auth/me`

- Reads the session cookie. 200 `{ user: PublicUser }` if valid, 401 `{ error: string }` if not.
  Lets the frontend know on page load whether a session already exists.

## Affected areas (new)

- `packages/shared/src/{colombia-cities,phone,password-policy,user}.ts`
- `apps/api/src/{models,repositories,services,routes,lib,middlewares}/*`, `container.ts`,
  `create-app.ts`, `index.ts`, `.env.example`
- `apps/web/src/{components/{atoms,molecules,organisms},pages,stores,lib,assets}/*`

## Risks

- **httpOnly cookie + separate dev ports (Vite on 5173, API on 3000)**: requires CORS with
  `credentials: true` and an explicit `CORS_ORIGIN`, and the frontend fetch wrapper must send
  `credentials: 'include'`. Documented in `.env.example` and `lib/api-client.ts`.
- **Brute-force login attempts**: initially accepted as a non-goal, but CodeQL's default code
  scanning flagged the unthrottled `/register`, `/login`, and `/me` handlers as a real high-severity
  finding on the PR. Mitigated with `express-rate-limit` on the whole `/auth` router
  (`middlewares/rate-limit.ts`, 20 requests / 15 min per IP by default, injectable for tests).

## Test strategy (TDD)

- `packages/shared`: one `*.test.ts` per validator, table-driven over valid/invalid inputs.
- `apps/api`: `auth.service.test.ts` against an in-memory fake `UserRepository` — no real file
  I/O, covers every acceptance criterion above as a case. `auth.routes.test.ts` (supertest)
  covers HTTP status codes, cookie flags, and that no response body ever contains `passwordHash`.
- `apps/web`: component tests for `PasswordInput` (toggle), `PasswordStrengthMeter` (score
  buckets), `FieldError` (renders/doesn't), `SearchableSelect` (filters, only accepts list
  members), and `RegisterForm`/`LoginForm` (client-side validation messages, submit wiring).
