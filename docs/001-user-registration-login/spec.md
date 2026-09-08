# 001 — User registration & login

## Problem

ThriftLoop has no way for a person to create an account or sign back in. Every other feature
(listing items, bidding) needs to know who the user is, so this is the first feature: a phone
number + password account system, scoped to Colombia for now.

## Goals

- A visitor can register with: phone number, first name, last name, city, password + password
  confirmation.
- A registered user can log in with phone number + password.
- Passwords are never stored or logged in plain text.
- A logged-in session is tracked via a secure cookie, without the frontend ever handling the raw
  token.
- Every validation rule enforced in the UI is also enforced server-side (never trust the client).
- Clear, specific feedback under each field when something is invalid — no generic "form is
  invalid" message.
- Mobile-first UI: usable and clear on a small screen first, scales up from there.

## Non-goals

- Password recovery / "forgot password" flow.
- Email address, email verification, or any contact method besides phone.
- Countries other than Colombia (the data model allows for it later, the UI/validation does not
  yet).
- Social login / OAuth.
- Editing profile data after registration.
- Admin/moderation of accounts.

## Acceptance criteria

### Registration

- [x] Given a phone number not already registered, valid names, a valid Colombian city, and a
      password meeting the policy with a matching confirmation, registration succeeds and the
      user is logged in immediately (session cookie set).
- [x] Phone number must be a Colombian mobile number: exactly 10 digits, starting with `3`.
      Invalid format is rejected with a specific error under the phone field.
- [x] First name and last name are required, non-empty after trimming.
- [x] City must be one of the fixed list of Colombian cities; anything else is rejected.
- [x] Password must be at least 8 characters and include at least one uppercase letter, one
      lowercase letter, and one digit. Each unmet rule is reported individually.
- [x] Password confirmation must match the password exactly, or the registration is rejected
      with an error under the confirmation field.
- [x] Registering with a phone number that is already registered is rejected with a clear error
      under the phone field (no other account details are leaked).
- [x] The stored password is a bcrypt hash — never the plain text password.
- [x] The response body never includes the password hash.

### Login

- [x] Given a registered phone number and its correct password, login succeeds and a session
      cookie is set.
- [x] An unknown phone number or an incorrect password both return the same generic error
      ("phone number or password is incorrect") — the UI cannot tell which one was wrong.
- [x] The session cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` when served over HTTPS.
- [x] All `/api/auth` routes are rate-limited per IP (added after CodeQL flagged the missing
      throttling on `/register`, `/login`, and `/me` — see plan.md).

### Deployment

- [x] The frontend and API are served from the **same origin** in production: the API exposes
      its routes under `/api/*` and serves the built frontend (static files + an SPA fallback to
      `index.html` for client-side routes) for everything else. One deployable service, not two.
      This isn't just simpler — it fixes a real bug: on two different origins, the session cookie
      (`SameSite=Lax` at the time) would be set by login but **not sent back** on the next
      `fetch('/auth/me', {credentials:'include'})`, because `Lax` cookies aren't sent on
      cross-site `fetch`/XHR requests, only top-level GET navigation. Same-origin removes the
      failure mode entirely and lets the cookie be `SameSite=Strict`. See plan.md for the
      deployment shape.

### Frontend UX

- [x] Mobile-first layout: single column, large touch targets, usable at 360px width without
      horizontal scrolling.
- [x] Password field has a visibility toggle (eye icon) to show/hide the typed password.
- [x] Registration form shows a live password strength indicator as the user types.
- [x] Every field shows its specific error in red text directly under the input, not in a toast
      or a summary block at the top of the form.
- [x] City is picked from a searchable list, not a long unfiltered dropdown.
- [x] The registration/login screens include a clothing-themed illustration to support a modern,
      on-brand look — bundled as a static asset, not loaded from an external image host.
