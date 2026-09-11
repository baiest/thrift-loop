# 013 — Tasks

- [x] 1. `auction.service.test.ts` + `auction.service.ts`: `closeAuctionManually` (owner-only, requires ≥1 bid, requires `published`, picks the same winner as the scheduler, reuses the mutex, publishes `auction-closed`)
- [x] 2. `auction.routes.test.ts` + `auction.routes.ts`: `POST /:id/close`
- [x] 3. `api-client.ts`: `markAuctionSold`
- [x] 4. `format.test.ts` + `format.ts`: `formatCOP` gets the `COP` suffix; swept `e2e/tests/*.spec.ts` — no hardcoded price strings found. Split off `formatCOPInput` (no suffix) for editable currency fields, whose backspace-to-clear logic broke once the suffix was appended to the same string being edited.
- [x] 5. `auction-detail-page.test.tsx` + `auction-detail-page.tsx`: `canUserMarkSold` + `MarkSoldControl` (confirm/cancel, matches `DeleteAuctionControl`); extracted `OwnerControls` to keep complexity under the limit
- [x] 6. `index.css`: confetti keyframes + `prefers-reduced-motion` entry
- [x] 7. `winner-celebration.tsx` (+ test) and its trigger hook in `auction-detail-page.tsx`. Extended `useFlashOnChange` with an optional `durationMs` param instead of duplicating its edge-detection logic.
- [x] 8. Full `npm run test:cov` + `lint` + `typecheck` pass (430 api / 496 web / 101 shared, all above the 85% coverage gate)
- [x] 9. `npm run e2e` pass (17/17)
- [x] 10. Manual verification: reseed, rebuild, two-tab live check — confirmed owner's manual close awards the highest bidder, the winner sees confetti live without reload, a non-winner viewing the same page doesn't, and price reads "$ 84.782 COP" everywhere (detail page, bid history)
