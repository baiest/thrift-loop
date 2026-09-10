import { useNavigate } from 'react-router-dom';
import { CreateAuctionWizard } from '../components/organisms/create-auction-wizard.js';

export function CreateAuctionPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-2xl flex-col py-6">
      <h1 className="mb-1 font-display text-3xl font-bold text-ink">Create auction</h1>
      <p className="mb-6 text-sm text-ink-soft">List a second-hand clothing item for auction.</p>

      <CreateAuctionWizard
        onSuccess={(auctionId) => {
          void navigate(`/auctions/${auctionId}`);
        }}
      />
    </div>
  );
}
