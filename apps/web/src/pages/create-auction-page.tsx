import { useNavigate } from 'react-router-dom';
import { CreateAuctionForm } from '../components/organisms/create-auction-form.js';

export function CreateAuctionPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6 pt-20">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Create auction</h1>
      <p className="mb-6 text-sm text-gray-600">List a second-hand clothing item for auction.</p>

      <CreateAuctionForm
        onSuccess={(auctionId) => {
          void navigate(`/auctions/${auctionId}`);
        }}
      />
    </main>
  );
}
