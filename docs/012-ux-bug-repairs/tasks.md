# 012 — Tasks

- [x] 1. `sidebar-nav.tsx`: add "My bids" to mobile tab bar (#7)
- [x] 2. `sidebar-nav.tsx`: add notification bell entry to mobile tab bar (#10)
- [x] 3. `currency-input.tsx`: fix clear-to-empty bug (#8)
- [x] 4. `filter-panel.tsx`: swap price inputs to `CurrencyInput` (#6)
- [x] 5. `auction-card.tsx`: `flex-wrap` on status badges (#15)
- [x] 6. `countdown.tsx`/`format.ts`/`auction-card.tsx`: unify countdown formatting, kill flicker (#4)
- [x] 7. `register-form.tsx` + `create-auction-wizard.tsx`: clear validation error live on valid input (#2)
- [x] 8. `text-input.tsx`/`textarea.tsx`: add maxLength counter; wire into wizard (#12)
- [x] 9. `create-auction-wizard.tsx`: persist created auction id across retry, no duplicate create (#13)
- [x] 10. `photo-dropzone.tsx`: fix overlapping thumbnail controls on mobile (#11)
- [x] 11. `auction-filters.tsx`/`filter-panel.tsx`: fix mobile search/filter width (#5)
- [x] 12. `auctions-page.tsx`: move filters to URL params, fix persistence (#16)
- [x] 13. `auction-detail-page.tsx`: add Delete auction control (owner, unsold only) (#14)
- [x] 14. `auction-detail-page.tsx` + `bid-form.tsx`: always render bid control, redirect to login when logged out (#1)
- [x] 15. Realtime: wire detail-page price/bid display to `useAuctionRealtime` (#9)
      — wiring already existed; fixed a real bug found in review: `withLiveUpdate`
      (detail page + `auction-grid.tsx`) unconditionally overwrote `currentBidCOP`/
      `bidCount`/`bidEndsAt` from the live update, so an `auction-closed` message for
      an auction with no bids zeroed the price display. `AuctionUpdate.currentBidCOP`
      is now `number | null` (was defaulting to `0`), and both `withLiveUpdate`s fall
      back to the fetched auction's value with `??`/`||`.
- [x] 16. `toggle.tsx`: fix broken thumb rendering — appearance-none + explicit `left-0.5` instead of implicit position (#3, #18 — turned out to be a real rendering bug, not mobile-specific)
- [x] 20. `sidebar-nav.tsx`: fix mobile nav horizontal overflow from 7 tabs — shorter labels, tighter padding (#19)
- [x] 17. `sidebar-nav.tsx`: add "My purchases" to mobile tab bar (#17, found after initial triage)
- [x] 18. `realtime.spec.ts` already asserts the detail-page live price update end to
      end (#9) — no change needed there. `create-and-publish-auction.spec.ts` left
      as-is: #13 (no duplicate create on retry) is covered by the
      `create-auction-wizard.test.tsx` unit test; forcing an upload failure in
      Playwright wasn't worth the added flakiness. Fixed 3 unrelated e2e regressions
      surfaced while running the suite (all from #16's URL-params work, not test
      additions): `auth.setup.ts` and two cases in `auth.spec.ts` asserted an exact
      `toHaveURL('/')`, but the post-login auctions page now lands with
      `?city=...&sort=newest` in the URL — relaxed to match path only.
- [x] 19. `npm run test:cov` (web/api/shared), `npm run typecheck`, `npm run lint`,
      `npm run e2e` all pass (441 web + 100 shared + API suite unit tests; 17/17 e2e).
      Also fixed a local-only `apps/api/.env` gap found while running e2e:
      `ALLOWED_ORIGINS` didn't include `http://localhost:3000` (the e2e server's own
      origin), so every WebSocket upgrade was silently rejected
      (`ws_upgrade_rejected reason=unauthenticated`) and `realtime.spec.ts` timed out
      waiting for the live price update — not a code bug, but worth noting since it
      would block realtime e2e for anyone else running this locally.
      Manual mobile-viewport check NOT done — no Chrome browser session available in
      this environment; #3/#5/#7/#10/#11/#15/#17 should get a quick 375px pass before
      merging.
