# Tasks — spec 011 login/register redesign

TDD where there's real behavior to test (the new `AuthHero` component's rendering contract);
purely visual/copy changes to existing tested components are verified by running the existing
suite green plus manual visual checks.

- [ ] `auth-hero.tsx` + `auth-hero.test.tsx` — renders the given headline and subtext; the
      decorative collage is `aria-hidden` (doesn't pollute the accessibility tree / screen readers
      with fake auction data).
- [ ] `login-page.tsx` — use `AuthHero`, restyle the form card, update subtext copy. Update
      `login-page.test.tsx` only if heading/link text actually changes.
- [ ] `register-page.tsx` — same treatment, its own headline/subtext. Update
      `register-page.test.tsx` only if heading/link text actually changes.
- [ ] `register-form.tsx` — wrap fields into three labeled `<fieldset>` sections (Contact, About
      you, Security); no change to `FormValues`, validators, or submit logic.
- [ ] `login-form.tsx` — spacing/visual polish only.
- [ ] Run `apps/web`'s full test suite — green.
- [ ] Manual check in the browser at mobile and desktop widths.
- [ ] `npm run verify` green.
