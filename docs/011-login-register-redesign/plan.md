# Plan — spec 011 login/register redesign

## Design direction

Explored with Stitch (design system: warm cream `#faf7f2`, terracotta `#c4562f`, ink `#1f1b16`,
Playfair Display headlines, generous rounded corners — matching `apps/web/src/index.css`'s
existing tokens). The generated concepts confirmed the direction: a terracotta hero panel with an
editorial serif headline and a small "live auction" card collage, transitioning into a clean cream
form card below. Adapted to this app's real constraints — no email field, no OAuth, English copy,
single-form (not multi-step) register, decorative cards use real `Badge`/`PhotoPlaceholder` atoms
rather than fabricated photography.

## Files

- **`apps/web/src/components/organisms/auth-hero.tsx`** (new) — the shared hero panel. Props:
  `headline`, `subtext`. Renders a terracotta gradient panel (`bg-gradient-to-br from-brand-600
to-brand-500`) with the serif headline, subtext, and 3 small decorative cards (each a
  `PhotoPlaceholder` + a `Badge` reading "Live", "Ending soon", "New bid") arranged in a loosely
  overlapping row — purely decorative, `aria-hidden` on the collage.
- **`apps/web/src/pages/login-page.tsx`** — replace the top illustration with `<AuthHero
headline="Your next favorite find is one bid away." subtext="Live auctions on secondhand
pieces, curated by people, not algorithms." />`. The existing `LoginForm` moves into a cream
  card (`rounded-t-3xl -mt-6 bg-surface`) that visually overlaps the hero's bottom edge. Keep the
  `<h1>Welcome back</h1>` heading (test-covered) inside that card, just restyled.
- **`apps/web/src/pages/register-page.tsx`** — same hero treatment with its own headline/subtext
  ("Join the circle." / "Buy pieces you'll actually wear, sell the ones you won't."); keep
  `<h1>Create your account</h1>` inside the form card.
- **`apps/web/src/components/organisms/register-form.tsx`** — purely presentational regrouping:
  wrap the existing `FormField`s (unchanged, same ids/labels/validators) into three visually
  labeled sections using a new small presentational helper (a `<fieldset>` with a `<legend>`
  styled as a small uppercase label, matching `profile-page.tsx`'s existing
  "NOTIFICATIONS"-style section header) — Contact (phone), About you (first/last name, city,
  category preference), Security (password, confirm password). No changes to `FormValues`,
  validators, submit handler, or field order in the DOM (labels still resolve the same way for
  `getByLabelText`).
- **`apps/web/src/components/organisms/login-form.tsx`** — light spacing/visual polish only
  (button/field spacing, no structural change) since it only has two fields and isn't "heavy".
- **`apps/web/src/pages/login-page.test.tsx`** / **`register-page.test.tsx`** — update only if the
  exact heading/link text changes; keep the same assertions otherwise (both headings stay
  "Welcome back" / "Create your account" per the plan above, so these likely need no change at
  all — confirm during implementation).

## Verification

- `npm run test` in `apps/web` — all existing `login-form`/`register-form`/`login-page`/
  `register-page` tests green unchanged (or updated only for copy).
- Manual: `npm run dev` in `apps/web` (+ `apps/api`), visit `/login` and `/register` at a mobile
  width and a desktop width, confirm the hero doesn't crowd the form, confirm tab order/labels
  still work, confirm the register form reads as clearly grouped rather than one long list.
- `npm run verify` green.
