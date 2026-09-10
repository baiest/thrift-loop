import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicAuction, PublicBid } from '@thrift-loop/shared';
import { minimumNextBid } from '@thrift-loop/shared';
import { ApiError, placeBid } from '../../lib/api-client.js';
import { Button } from '../atoms/button.js';
import { FormField } from '../molecules/form-field.js';
import { CurrencyInput } from '../molecules/currency-input.js';

export interface BidFormProps {
  readonly auctionId: string;
  readonly currentBidCOP: number | null;
  readonly priceCOP: number;
  readonly onBidPlaced: (auction: PublicAuction, bid: PublicBid) => void;
  readonly disabled?: boolean;
  /** True when the viewer isn't logged in: submitting sends them to /login
   * instead of attempting to place a bid, rather than hiding the form. */
  readonly requiresLogin?: boolean;
}

export function BidForm({
  auctionId,
  currentBidCOP,
  priceCOP,
  onBidPlaced,
  disabled = false,
  requiresLogin = false,
}: BidFormProps): React.JSX.Element {
  const navigate = useNavigate();
  const minimum = minimumNextBid(currentBidCOP, priceCOP);
  const [amount, setAmount] = useState(String(minimum));
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (requiresLogin) {
      void navigate('/login');
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      const { auction, bid } = await placeBid(auctionId, Number(amount));
      onBidPlaced(auction, bid);
    } catch (caught) {
      const message =
        caught instanceof ApiError
          ? (caught.fields?.['amountCOP'] ?? caught.message)
          : 'Something went wrong';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  let submitLabel = 'Place bid';
  if (requiresLogin) {
    submitLabel = 'Log in to place a bid';
  } else if (submitting) {
    submitLabel = 'Placing bid…';
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <FormField id="amountCOP" label="Your bid (COP)" error={error}>
        <CurrencyInput
          id="amountCOP"
          value={amount}
          invalid={Boolean(error)}
          onChange={setAmount}
        />
      </FormField>
      <Button type="submit" disabled={disabled || submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
