import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips } from './filter-chips.js';
import type { AuctionFilters } from '../../lib/api-client.js';

const EMPTY_VALUE: AuctionFilters = {
  search: '',
  category: '',
  city: '',
  minPriceCOP: '',
  maxPriceCOP: '',
};

describe('FilterChips', () => {
  it('renders nothing when no filter is active', () => {
    const { container } = render(<FilterChips value={EMPTY_VALUE} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render a chip for the search field', () => {
    render(<FilterChips value={{ ...EMPTY_VALUE, search: 'jacket' }} onChange={vi.fn()} />);
    expect(screen.queryByText(/jacket/i)).not.toBeInTheDocument();
  });

  it('renders a chip for an active city filter', () => {
    render(<FilterChips value={{ ...EMPTY_VALUE, city: 'Bogotá D.C.' }} onChange={vi.fn()} />);
    expect(screen.getByText('Bogotá D.C.')).toBeInTheDocument();
  });

  it('renders a chip for an active category filter', () => {
    render(<FilterChips value={{ ...EMPTY_VALUE, category: 'jeans' }} onChange={vi.fn()} />);
    expect(screen.getByText('Jeans')).toBeInTheDocument();
  });

  it('renders chips for min and max price filters', () => {
    render(
      <FilterChips
        value={{ ...EMPTY_VALUE, minPriceCOP: '10000', maxPriceCOP: '50000' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it('clears only the removed filter when its chip is removed', async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        value={{ ...EMPTY_VALUE, city: 'Bogotá D.C.', category: 'jeans' }}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /remove.*bogotá/i }));

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_VALUE,
      city: '',
      category: 'jeans',
    });
  });

  it('clears every active filter when "Clear all" is clicked', async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        value={{ ...EMPTY_VALUE, city: 'Bogotá D.C.', category: 'jeans' }}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));

    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_VALUE,
      city: '',
      category: '',
    });
  });
});
