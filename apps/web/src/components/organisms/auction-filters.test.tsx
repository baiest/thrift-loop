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

describe('AuctionFilters', () => {
  it('renders the current search value', () => {
    render(<AuctionFilters value={{ ...emptyFilters, search: 'chaqueta' }} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Search')).toHaveValue('chaqueta');
  });

  it('calls onChange with the updated search text', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Search'), 'c');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, search: 'c' });
  });

  it('calls onChange with the selected category', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, category: 'jeans' });
  });

  it('calls onChange with the selected city', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('City'), 'Cali');
    await userEvent.click(screen.getByRole('button', { name: 'Cali' }));

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, city: 'Cali' });
  });

  it('calls onChange with the min price', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Min price (COP)'), '1');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, minPriceCOP: '1' });
  });

  it('calls onChange with the max price', async () => {
    const onChange = vi.fn();
    render(<AuctionFilters value={emptyFilters} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Max price (COP)'), '1');

    expect(onChange).toHaveBeenCalledWith({ ...emptyFilters, maxPriceCOP: '1' });
  });
});
