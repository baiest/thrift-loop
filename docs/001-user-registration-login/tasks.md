# 001 — Tasks

## packages/shared

- [x] Scaffold `packages/shared` workspace (package.json, tsconfig, vitest config)
- [x] `phone.ts` + test: `isColombianMobilePhone()`
- [x] `colombia-cities.ts` + test: `COLOMBIA_CITIES`, `isColombiaCity()`
- [x] `password-policy.ts` + test: `validatePassword()`, `passwordStrength()`
- [x] `user.ts`: `PublicUser` type

## apps/api

- [x] Scaffold `apps/api` workspace (package.json, tsconfig, vitest config, `.env.example`)
- [x] `models/user.ts`
- [x] `repositories/user.repository.ts` (interface) + `.json.ts` impl + test
- [x] `lib/jwt.ts` (sign/verify, fails fast without `JWT_SECRET`) + test
- [x] `lib/cookies.ts` (session cookie options) + test
- [x] `services/auth.service.ts` (register, login) + test against fake repository, covering every
      acceptance criterion in `spec.md`
- [x] `middlewares/require-auth.ts` + test
- [x] `routes/auth.routes.ts` (register/login/logout/me) + test (supertest)
- [x] `container.ts` wiring the JSON repository
- [x] `create-app.ts` / `index.ts`

## apps/web

- [x] Scaffold `apps/web` workspace (Vite + React + TS + Tailwind + vitest + Testing Library)
- [x] `lib/api-client.ts` (fetch wrapper, `credentials: 'include'`)
- [x] `stores/auth-store.ts` (Zustand) + test
- [x] `components/atoms/text-input.tsx` + test
- [x] `components/atoms/password-input.tsx` (eye toggle) + test
- [x] `components/atoms/field-error.tsx` + test
- [x] `components/atoms/button.tsx` + test
- [x] `components/molecules/form-field.tsx` + test
- [x] `components/molecules/password-strength-meter.tsx` + test
- [x] `components/molecules/searchable-select.tsx` + test
- [x] `assets/clothing-illustration.svg`
- [x] `components/organisms/register-form.tsx` + test
- [x] `components/organisms/login-form.tsx` + test
- [x] `pages/register-page.tsx`, `pages/login-page.tsx`
- [x] Wire `react-router-dom`, mount pages in `app.tsx`

## Wrap-up

- [x] `npm run verify` green (typecheck, lint, format, coverage >85%, build)
- [x] Manual smoke test: register, check `data/users.json` has a bcrypt hash, log in, check
      `Set-Cookie` has `HttpOnly`
- [ ] Open PR, confirm all 3 CI checks pass, leave merge for the user

## Note on process

Implementation and tests were written together per file, not in strict TDD red-green-refactor
order as `AGENTS.md` requires. Flagged to the user; agreed to keep this spec as-is and follow
strict TDD for all subsequent work.
