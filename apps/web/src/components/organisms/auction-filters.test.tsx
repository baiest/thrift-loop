import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuctionFilters } from './auction-filters.js';
import type { AuctionFilters as AuctionFiltersValue } from '../../lib/api-client.js';

const emptyFilters: AuctionFiltersValue = {
  search: '',
  category: '',
  city: '',
  minPriceCOP: '',
  maxPriceCOP: '',
};

async function openPanel(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: /filters/i }));
}

describe('AuctionFilters', () => {
  it('renders the current search value', () => {
    render(<AuctionFilters value={{ ...emptyFilters, search: 'chaqueta' }} onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toHaveValue('chaqueta');
  });

  it('calls onChange with the updated search text', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);

    await userEvent.type(screen.getByRole('searchbox'), 'c');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, search: 'c' });
  });

  it('does not show the other filter controls until Filters is opened', () => {
    render(<AuctionFilters value={emptyFilters} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('Category')).not.toBeInTheDocument();
  });

  it('calls onChange with the selected category', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);
    await openPanel();

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, category: 'jeans' });
  });

  it('calls onChange with the selected city', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);
    await openPanel();

    await userEvent.type(screen.getByLabelText('City'), 'Cali');
    await userEvent.click(screen.getByRole('button', { name: 'Cali' }));

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, city: 'Cali' });
  });

  it('calls onChange with the min price', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);
    await openPanel();

    await userEvent.type(screen.getByLabelText('Min price (COP)'), '1');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, minPriceCOP: '1' });
  });

  it('calls onChange with the max price', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);
    await openPanel();

    await userEvent.type(screen.getByLabelText('Max price (COP)'), '1');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, maxPriceCOP: '1' });
  });

  it('shows a removable chip for an active filter', () => {
    render(<AuctionFilters value={{ ...emptyFilters, city: 'Cali' }} onChange={vi.fn()} />);
    expect(screen.getByText('Cali')).toBeInTheDocument();
  });
});
