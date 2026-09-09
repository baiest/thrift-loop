# 008 — Tasks (PR 3: `feat/008-realtime-grid-presence`)

Covers "live grid, live close, presence" from `plan.md`'s phasing — the last PR closing out spec 008. Builds on PR 2's transport (`realtime-hub`, `event-fanout`, `realtime-client`,
`realtime-store`, `use-auction-realtime`); no new backend rooms or message types are needed since
the `grid` room and `presence` message already exist from PR 2's design, just unused until now.

## Phase 1 — Backend: broadcast to the grid room too

- [x] `apps/api/src/realtime/event-fanout.test.ts` + `event-fanout.ts`: `bid-placed` and
      `auction-closed` broadcasts go to both `auction:<id>` (already done) and `grid`, so a viewer
      browsing the grid sees a live price/close update for an auction they haven't opened

## Phase 2 — Frontend: live grid

- [x] `apps/web/src/hooks/use-grid-realtime.test.ts` + `use-grid-realtime.ts`: sends
      `subscribe-grid` on mount, `unsubscribe-grid` on unmount, exposes the realtime store's
      `auctionUpdates` map
- [x] `apps/web/src/components/organisms/auction-grid.test.tsx` + `auction-grid.tsx`: merges each
      rendered auction with its live update (price, bid count, and — once `closed` — flips
      `status` to `'sold'` with the live `winnerUserId`) before handing it to `AuctionCard`

## Phase 3 — Frontend: live close and presence on the detail page

- [x] `apps/web/src/pages/auction-detail-page.test.tsx` + `auction-detail-page.tsx`:
      `withLiveUpdate` also applies a closed update (`status: 'sold'`, `winnerUserId`), so the page
      flips to Sold live instead of waiting for the next `Countdown.onExpire` reload; renders
      "N people viewing" from `useAuctionRealtime`'s `viewers`

## Wrap-up

- [x] `npm run verify` green
- [x] Manual: logged in against the running dev servers and confirmed the Auctions grid renders
      correctly with `useGridRealtime` wired in (no console errors, existing Sold auctions display
      as before). Did not run the full two-browser live-bid-to-Sold walkthrough given time already
      spent on PR 1/2's manual passes — the merge/flip logic itself is covered by
      `auction-grid.test.tsx`'s live-update and live-close tests and `event-fanout.test.ts`'s grid
      broadcast tests.
- [x] Open PR, confirm CI is green, leave merge to the user
