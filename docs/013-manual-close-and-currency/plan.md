# 013 — Plan

## Approach

Reuse the existing close/notify/broadcast pipeline instead of building a
parallel one: a manual close writes the exact same `AuctionUpdated`... i.e.
`'auction-closed'` `DomainEvent` that `publish-scheduler.ts`'s `closeOneAuction`
already publishes, so `notification.service.ts` and `event-fanout.ts` need no
changes to give the manual path notifications + realtime for free.

The celebration is pure client state: `useAuctionRealtime` already surfaces
`update.closed`/`update.winnerUserId` the moment the `'auction-closed'`
`ServerMessage` arrives (`realtime-store.ts`'s `applyServerMessage`). Since
that store entry only changes on a genuine live push (never replayed on
reconnect/refetch), the existing `useFlashOnChange` "changed since mount"
pattern is enough to get an exactly-once, live-only trigger without a new
flag or backend support.

Currency fix is a single-function change (`formatCOP`) because every price
render already goes through it — confirmed, no other file formats money by
hand.

## Key decisions

- Decision: new `auction.service.ts` method (`closeAuctionManually`), not a
  relaxed `updateAuction` — Rationale: `updateAuction`'s `status !== 'draft'`
  gate is a real invariant for the general edit path (no editing a live
  auction's title/price mid-bid); overloading it for closing would weaken
  that guarantee for every other field too.
- Decision: winner = `bidRepository.findByAuctionId(id)[0]` — Rationale: same
  "newest bid is highest" invariant `closeOneAuction` already relies on
  (bids are only ever placed in increasing order); keeps one winner-selection
  rule in the codebase, not two.
- Decision: reuse the scheduler's `KeyedMutex` on the auction id — Rationale:
  the same auction could get a manual close and a landing bid at the same
  instant; the mutex already exists precisely for this class of race.
- Decision: celebration keyed off `update?.winnerUserId` via
  `useFlashOnChange`, gated by `update?.closed` — Rationale: matches the
  existing `usePriceFlash` idiom in the same file; avoids inventing a second
  "seen it" flag when the store's own update-vs-no-update distinction already
  provides one.
- Decision: CSS-only confetti, no new dependency — per user decision.
- Decision: `formatCOP` appends a literal `COP` suffix — per user decision;
  keeps the familiar `$` for local users while removing the ambiguity.

## Affected areas

- `apps/api/src/services/auction.service.ts` — new `closeAuctionManually`.
- `apps/api/src/routes/auction.routes.ts` — new `POST /:id/close`.
- `apps/web/src/lib/api-client.ts` — new `markAuctionSold`.
- `apps/web/src/pages/auction-detail-page.tsx` — `canUserMarkSold`,
  `MarkSoldControl`, celebration trigger + `WinnerCelebration` mount.
- `apps/web/src/components/molecules/winner-celebration.tsx` — new.
- `apps/web/src/index.css` — new confetti keyframes + reduced-motion entry.
- `apps/web/src/lib/format.ts` — `formatCOP` suffix.

## Risks

- Existing tests assert `formatCOP`'s exact output (`format.test.ts`,
  `bid-form.test.tsx`, `auction-card.test.tsx`, e2e specs) — mitigated by
  updating the regexes as part of the same TDD pass, and grepping `e2e/` for
  any hardcoded price string before considering this done.
- A manual close racing a bid — mitigated by the shared mutex (same
  key/pattern already proven in `bid.service.ts`/`publish-scheduler.ts`).
- Complexity budget (≤10 per function, per `AGENTS.md`) on
  `auction-detail-page.tsx`, already close to the limit — mitigated by
  extracting the celebration trigger into its own small hook, matching how
  `usePriceFlash`/`useBidHistorySync` were already factored out.

## Test strategy

Unit-level, TDD, red-green-refactor per `AGENTS.md`:

- `auction.service.test.ts`: success with ≥1 bid; 409/400 on no bids, wrong
  owner, `draft`, already-`sold`; asserts the published event shape.
- `auction.routes.test.ts`: `POST /:id/close` auth/csrf/status-code matrix.
- `format.test.ts`: suffix present, existing cases updated.
- `auction-detail-page.test.tsx`: control visibility matrix; confirm/cancel
  flow calls `markAuctionSold`; celebration shows only for the winner on a
  live close, not on initial fetch of an already-sold auction, not for a
  non-winner, not repeated after a `resyncToken` bump.
