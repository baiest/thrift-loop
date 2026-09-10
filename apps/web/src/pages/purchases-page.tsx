import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicPurchase } from '@thrift-loop/shared';
import { fetchCurrentUser, fetchMyPurchases } from '../lib/api-client.js';
import { formatCOP } from '../lib/format.js';
import { useAuthStore } from '../stores/auth-store.js';

function HandoverDetail({ purchase }: { readonly purchase: PublicPurchase }): React.JSX.Element {
  if (purchase.handover.mode === 'delivery') {
    return <p className="text-sm text-ink-soft">Ship to: {purchase.handover.address}</p>;
  }
  return <p className="text-sm text-ink-soft">Pick up in: {purchase.handover.city}</p>;
}

export function PurchasesPage(): React.JSX.Element | null {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [checkingSession, setCheckingSession] = useState(user === null);
  const [purchases, setPurchases] = useState<PublicPurchase[]>([]);

  useEffect(() => {
    if (user) {
      return;
    }
    void fetchCurrentUser()
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          void navigate('/login');
        }
      })
      .finally(() => setCheckingSession(false));
  }, [user, setUser, navigate]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void fetchMyPurchases().then(setPurchases);
  }, [user]);

  if (checkingSession || !user) {
    return null;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col py-6">
      <h1 className="mb-4 font-display text-3xl font-bold text-ink">My purchases</h1>
      {purchases.length === 0 ? (
        <p className="text-sm text-ink-soft">No purchases yet.</p>
      ) : (
        <ul className="space-y-3">
          {purchases.map((purchase) => (
            <li key={purchase.auction.id} className="rounded-lg border border-hairline p-3">
              <p className="text-lg font-semibold text-ink">
                {formatCOP(purchase.auction.currentBidCOP ?? purchase.auction.priceCOP)}
              </p>
              <HandoverDetail purchase={purchase} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
