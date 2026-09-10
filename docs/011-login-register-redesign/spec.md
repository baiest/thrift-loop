# 011 — Login & register redesign

## Problem

Login and registration are the first thing anyone sees, and today they look like a generic
utility form: a small illustration, plain black-on-white labels, no sense of what ThriftLoop
actually is. The register form in particular feels heavy — seven fields stacked in a single
column with no visual grouping. Neither screen carries any of the warm, editorial,
secondhand-boutique personality the rest of the app (Playfair Display headlines, terracotta
accents, cream surfaces) already has.

## Goals

- A login and register experience with real personality: an editorial hero moment that sells the
  "curated live auctions" idea, not just a form.
- The register form reorganized into clearly labeled sections (contact, profile, security) so it
  reads as light and quick despite having the same number of fields — still one form, one submit,
  no multi-step wizard.
- Warmer, more inviting copy on both screens, consistent with the brand voice used elsewhere
  (`sidebar-nav.tsx`'s "Thrift Loop / Secondhand Fashion", `auctions-page.tsx`'s copy).
- Shared visual language between login and register (same hero treatment) so moving between them
  feels continuous.

## Non-goals

- No change to the register form's field set, validation rules, or submission flow — same fields,
  same API calls, same error handling.
- No multi-step/wizard flow for registration (evaluated and explicitly rejected — adds friction
  for no benefit over a well-organized single form).
- No social/OAuth login — phone + password stays the only auth method.
- No fabricated product photography — the hero's auction-card decoration uses the existing
  placeholder/badge components, not stock or generated photos of real items.

## Acceptance criteria

- [ ] A new `AuthHero` component renders on both `/login` and `/register`: a terracotta panel with
      a serif headline, a short supporting line, and a small set of decorative "live auction"
      cards (using the existing `Badge`/`PhotoPlaceholder` atoms) suggesting bids in progress.
- [ ] The login form section keeps its own clear heading and sits on a cream card that visually
      overlaps/transitions from the hero panel above it.
- [ ] The register form is visually grouped into labeled sections (e.g. "Contact", "About you",
      "Security") without changing its fields, order of validation, or any of its existing
      behavior.
- [ ] Copy on both screens is warmer and more inviting than today's, while staying consistent with
      the app's existing English-language UI copy.
- [ ] All existing `login-form.test.tsx`, `register-form.test.tsx` behavior keeps passing
      unchanged; `login-page.test.tsx`/`register-page.test.tsx` are updated only where copy
      changed.
- [ ] Responsive: the hero doesn't crowd out the form on small screens (mobile-first, matching the
      rest of the app).

## Open questions

- None blocking approval.
