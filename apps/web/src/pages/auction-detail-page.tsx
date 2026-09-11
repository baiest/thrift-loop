import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PublicAuction, PublicBid, PublicUser } from '@thrift-loop/shared';
import {
  deleteAuction,
  fetchAuctionDetail,
  fetchBids,
  fetchCurrentUser,
  markAuctionSold,
  updateAuction,
} from '../lib/api-client.js';
import { formatCOP } from '../lib/format.js';
import { withLiveAuctionUpdate } from '../lib/live-auction.js';
import { Countdown } from '../components/molecules/countdown.js';
import { BidHistory } from '../components/molecules/bid-history.js';
import { BidForm } from '../components/organisms/bid-form.js';
import { Button } from '../components/atoms/button.js';
import { Skeleton } from '../components/atoms/skeleton.js';
import { PhotoPlaceholder } from '../components/atoms/photo-placeholder.js';
import { WinnerCelebration } from '../components/molecules/winner-celebration.js';
import { useAuctionRealtime } from '../hooks/use-auction-realtime.js';
import { useFlashOnChange } from '../hooks/use-flash-on-change.js';
import { useRealtimeStore, type AuctionUpdate } from '../stores/realtime-store.js';
import { useAuthStore } from '../stores/auth-store.js';

const STALE_AFTER_MS = 15_000;

/** True once `status` has stayed 'reconnecting' for longer than `staleAfterMs`. */
function useIsStaleConnection(status: string, staleAfterMs: number): boolean {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (status !== 'reconnecting') {
      setStale(false);
      return;
    }
    const timer = setTimeout(() => setStale(true), staleAfterMs);
    return () => clearTimeout(timer);
  }, [status, staleAfterMs]);

  return stale;
}

function ViewerCount({ viewers }: { readonly viewers: number }): React.JSX.Element | null {
  if (viewers <= 0) {
    return null;
  }
  return (
    <p className="mb-4 text-xs text-ink-soft">
      {viewers} {viewers === 1 ? 'person' : 'people'} viewing
    </p>
  );
}

function AuctionPhoto({
  auction,
  photoFailed,
  onPhotoError,
}: {
  readonly auction: PublicAuction;
  readonly photoFailed: boolean;
  readonly onPhotoError: () => void;
}): React.JSX.Element {
  if (!auction.photoUrls[0] || photoFailed) {
    return <PhotoPlaceholder className="aspect-square" />;
  }
  return (
    <img
      src={auction.photoUrls[0]}
      alt={auction.category}
      onError={onPhotoError}
      className="aspect-square w-full rounded-lg object-cover"
    />
  );
}

interface DetailState {
  auction: PublicAuction;
  serverOffsetMs: number;
}

function canUserBid(user: PublicUser | null, auction: PublicAuction): boolean {
  return auction.status === 'published' && (user === null || user.id !== auction.userId);
}

function canUserPublish(user: PublicUser | null, auction: PublicAuction): boolean {
  return user !== null && user.id === auction.userId && auction.status === 'draft';
}

function canUserDelete(user: PublicUser | null, auction: PublicAuction): boolean {
  const isUnsold =
    auction.status === 'draft' || (auction.status === 'published' && auction.bidCount === 0);
  return user !== null && user.id === auction.userId && isUnsold;
}

function canUserMarkSold(user: PublicUser | null, auction: PublicAuction): boolean {
  return (
    user !== null &&
    user.id === auction.userId &&
    auction.status === 'published' &&
    auction.bidCount > 0
  );
}

/** Hydrates the shared auth store on mount. RealtimeConnection (and
 * SidebarNav) key off useAuthStore, so a fresh/direct load of this page must
 * hydrate it the same way every other route does — otherwise the realtime
 * WebSocket never opens on a direct visit here. */
function useHydrateAuthUser(
  setAuthUser: (user: PublicUser) => void,
  clearAuthUser: () => void,
): void {
  useEffect(() => {
    void fetchCurrentUser().then((fetchedUser) => {
      if (fetchedUser) {
        setAuthUser(fetchedUser);
      } else {
        clearAuthUser();
      }
    });
    // Deliberately mount-only despite listing setAuthUser/clearAuthUser: they're
    // stable Zustand action references, not values this effect should re-run on.
  }, [setAuthUser, clearAuthUser]);
}

/** withLiveAuctionUpdate merges price/bidCount into `auction` locally, but the bid
 * history list is its own `bids` state — without this, a live bid from
 * another viewer moves the price on screen while the list below it stays
 * stale until a manual reload. Only refetches bids (not the full auction
 * detail — that already updates locally) when a live message actually
 * reports a new bid count (`bidCount` is undefined until the first live
 * message arrives, so this stays inert on mount). */
function useBidHistorySync(
  id: string | undefined,
  update: AuctionUpdate | null,
  setBids: (bids: PublicBid[]) => void,
): void {
  const bidCount = update?.bidCount;
  useEffect(() => {
    if (!id || bidCount === undefined) {
      return;
    }
    void fetchBids(id).then(setBids);
    // setBids is a stable useState setter; only id/bidCount should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bidCount]);
}

/** True for a brief window after a live message actually moves the price —
 * keyed on the raw update, not the merged display value, so this stays
 * inert for the initial fetch and only fires for a genuine live push. */
function usePriceFlash(update: AuctionUpdate | null): boolean {
  return useFlashOnChange(update?.currentBidCOP ?? null);
}

const CELEBRATION_DURATION_MS = 4000;

/** True for a few seconds right after a live 'auction-closed' message names
 * the current viewer as the winner. Keyed on the raw update (not the merged
 * auction) so this stays inert for the initial fetch of an already-sold
 * auction — only a genuine live push changes `update`. */
function useWinnerCelebration(update: AuctionUpdate | null, userId: string | undefined): boolean {
  const wonJustNow = useFlashOnChange(
    update?.closed ? update.winnerUserId : null,
    CELEBRATION_DURATION_MS,
  );
  return wonJustNow && update?.winnerUserId === userId;
}

function flashClass(active: boolean): string {
  return active ? 'animate-flash-highlight' : '';
}

function DeleteAuctionControl({
  auctionId,
  onDeleted,
}: {
  readonly auctionId: string;
  readonly onDeleted: () => void;
}): React.JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);

  async function handleDelete(): Promise<void> {
    setDeleteError(undefined);
    setDeleting(true);
    try {
      await deleteAuction(auctionId);
      onDeleted();
    } catch {
      setDeleteError('Could not delete the auction. Please try again.');
      setDeleting(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        type="button"
        fullWidth={false}
        onClick={() => setConfirming(true)}
        // `!` overrides: Button's own bg-brand-500/text-white base classes are
        // the same CSS specificity as these, and would otherwise win the
        // cascade tie regardless of this string's order, rendering white text
        // on a white background.
        className="!bg-white !text-red-600 ring-1 ring-inset ring-red-200 hover:!bg-red-50"
      >
        Delete auction
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">Delete this auction? This cannot be undone.</p>
      <div className="flex gap-2">
        <Button
          type="button"
          fullWidth={false}
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700"
        >
          {deleting ? 'Deleting…' : 'Confirm delete'}
        </Button>
        <Button
          type="button"
          fullWidth={false}
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="!bg-white !text-ink ring-1 ring-inset ring-hairline hover:!bg-linen"
        >
          Cancel
        </Button>
      </div>
      {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
    </div>
  );
}

function MarkSoldControl({
  auctionId,
  onSold,
}: {
  readonly auctionId: string;
  readonly onSold: () => void;
}): React.JSX.Element {
  const [closing, setClosing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [closeError, setCloseError] = useState<string | undefined>(undefined);

  async function handleClose(): Promise<void> {
    setCloseError(undefined);
    setClosing(true);
    try {
      await markAuctionSold(auctionId);
      onSold();
    } catch {
      setCloseError('Could not close the auction. Please try again.');
      setClosing(false);
    }
  }

  if (!confirming) {
    return (
      <Button type="button" fullWidth={false} onClick={() => setConfirming(true)}>
        Mark as sold
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">
        Sell it now to the current highest bidder? This cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          fullWidth={false}
          onClick={() => void handleClose()}
          disabled={closing}
        >
          {closing ? 'Closing…' : 'Confirm mark as sold'}
        </Button>
        <Button
          type="button"
          fullWidth={false}
          onClick={() => setConfirming(false)}
          disabled={closing}
          className="!bg-white !text-ink ring-1 ring-inset ring-hairline hover:!bg-linen"
        >
          Cancel
        </Button>
      </div>
      {closeError && <p className="text-sm text-red-600">{closeError}</p>}
    </div>
  );
}

function OwnerControls({
  auction,
  canPublish,
  canMarkSold,
  canDelete,
  onPublish,
  onSold,
  onDeleted,
}: {
  readonly auction: PublicAuction;
  readonly canPublish: boolean;
  readonly canMarkSold: boolean;
  readonly canDelete: boolean;
  readonly onPublish: () => void;
  readonly onSold: () => void;
  readonly onDeleted: () => void;
}): React.JSX.Element {
  return (
    <>
      {canPublish && (
        <div className="mb-6">
          <Button type="button" onClick={onPublish}>
            Publish now
          </Button>
        </div>
      )}
      {canMarkSold && (
        <div className="mb-6">
          <MarkSoldControl auctionId={auction.id} onSold={onSold} />
        </div>
      )}
      {canDelete && (
        <div className="mb-6">
          <DeleteAuctionControl auctionId={auction.id} onDeleted={onDeleted} />
        </div>
      )}
    </>
  );
}

function BidWindowStatus({
  auction,
  serverOffsetMs,
  onExpire,
}: {
  readonly auction: PublicAuction;
  readonly serverOffsetMs: number;
  readonly onExpire: () => void;
}): React.JSX.Element {
  // A seed script or clock skew can leave bidEndsAt in the future for an
  // already-sold auction — status wins over a live timer.
  if (auction.status === 'sold') {
    return <span className="text-sm font-medium text-ink">Ended</span>;
  }
  return (
    <Countdown endsAt={auction.bidEndsAt} serverOffsetMs={serverOffsetMs} onExpire={onExpire} />
  );
}

export function AuctionDetailPage(): React.JSX.Element | null {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [bids, setBids] = useState<PublicBid[]>([]);
  // The shared store, not a page-local one: RealtimeConnection (and
  // SidebarNav) key off useAuthStore, so a fresh/direct load of this page
  // must hydrate it the same way every other route does — otherwise the
  // realtime WebSocket never opens on a direct visit here.
  const user = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const clearAuthUser = useAuthStore((state) => state.clearUser);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoFailed, setPhotoFailed] = useState(false);
  const { update, viewers } = useAuctionRealtime(id);
  const resyncToken = useRealtimeStore((state) => state.resyncToken);
  const connectionStatus = useRealtimeStore((state) => state.status);
  const showReconnecting = useIsStaleConnection(connectionStatus, STALE_AFTER_MS);

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      return;
    }
    const [result, fetchedBids] = await Promise.all([fetchAuctionDetail(id), fetchBids(id)]);
    if (!result) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setDetail({
      auction: result.auction,
      serverOffsetMs: Date.now() - new Date(result.serverTime).getTime(),
    });
    setBids(fetchedBids);
    setLoading(false);
  }, [id]);

  useHydrateAuthUser(setAuthUser, clearAuthUser);

  useEffect(() => {
    void load();
  }, [load, resyncToken]);

  useBidHistorySync(id, update, setBids);
  const priceFlash = usePriceFlash(update);
  const celebrating = useWinnerCelebration(update, user?.id);

  if (loading) {
    return (
      <div
        aria-label="Loading auction details"
        className="mx-auto grid max-w-4xl gap-6 py-6 lg:grid-cols-2"
      >
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    );
  }

  if (notFound || !detail) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col py-6">
        <p className="text-sm text-ink-soft">Auction not found.</p>
      </div>
    );
  }

  const { serverOffsetMs } = detail;
  const auction = withLiveAuctionUpdate(detail.auction, update);
  const canBid = canUserBid(user, auction);
  const canPublish = canUserPublish(user, auction);
  const canDelete = canUserDelete(user, auction);
  const canMarkSold = canUserMarkSold(user, auction);

  async function handlePublish(): Promise<void> {
    await updateAuction(auction.id, { status: 'published' });
    await load();
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col py-6">
      {celebrating && <WinnerCelebration />}
      {showReconnecting && <p className="mb-4 text-xs font-medium text-amber-700">Reconnecting…</p>}
      <div className="grid gap-8 lg:grid-cols-2">
        <AuctionPhoto
          auction={auction}
          photoFailed={photoFailed}
          onPhotoError={() => setPhotoFailed(true)}
        />

        <div className="flex flex-col">
          <h1 className="mb-1 font-display text-3xl font-bold text-ink">{auction.title}</h1>
          <p className="mb-2 text-sm text-ink-soft">{auction.location}</p>
          <p className="mb-4 whitespace-pre-wrap text-sm text-ink-soft">{auction.description}</p>
          <p className="text-sm text-ink-soft">
            {auction.currentBidCOP === null ? 'Starting at' : 'Current bid'}
          </p>
          <p
            className={`mb-2 inline-block rounded-md text-3xl font-bold text-ink ${flashClass(priceFlash)}`}
          >
            {formatCOP(auction.currentBidCOP ?? auction.priceCOP)}
          </p>
          <div className="mb-4">
            <BidWindowStatus
              auction={auction}
              serverOffsetMs={serverOffsetMs}
              onExpire={() => void load()}
            />
          </div>
          <ViewerCount viewers={viewers} />

          <OwnerControls
            auction={auction}
            canPublish={canPublish}
            canMarkSold={canMarkSold}
            canDelete={canDelete}
            onPublish={() => void handlePublish()}
            onSold={() => void load()}
            onDeleted={() => void navigate('/auctions/mine')}
          />

          {canBid && (
            <div className="mb-6">
              <BidForm
                auctionId={auction.id}
                currentBidCOP={auction.currentBidCOP}
                priceCOP={auction.priceCOP}
                onBidPlaced={() => void load()}
                requiresLogin={user === null}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold text-ink">Bid history</h2>
        <BidHistory bids={bids} />
      </div>
    </div>
  );
}
