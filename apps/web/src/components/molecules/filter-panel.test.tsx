import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from './filter-panel.js';
import type { AuctionFilters } from '../../lib/api-client.js';

const EMPTY_VALUE: AuctionFilters = {
  search: '',
  category: '',
  city: '',
  minPriceCOP: '',
  maxPriceCOP: '',
};

describe('FilterPanel', () => {
  it('shows a Filters toggle button', () => {
    render(<FilterPanel value={EMPTY_VALUE} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('hides the filter controls by default', () => {
    render(<FilterPanel value={EMPTY_VALUE} onChange={vi.fn()} />);
    expect(screen.queryByLabelText('City')).not.toBeInTheDocument();
  });

  it('shows the filter controls once the toggle is clicked', async () => {
    render(<FilterPanel value={EMPTY_VALUE} onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Min price (COP)')).toBeInTheDocument();
    expect(screen.getByLabelText('Max price (COP)')).toBeInTheDocument();
  });

  it('shows no count badge when no filter is active', () => {
    render(<FilterPanel value={EMPTY_VALUE} onChange={vi.fn()} />);
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('shows a count badge of active filters', () => {
    render(
      <FilterPanel
        value={{ ...EMPTY_VALUE, city: 'Bogotá D.C.', category: 'jeans' }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders the open panel full-width, not nested inside the toggle button', async () => {
    render(<FilterPanel value={EMPTY_VALUE} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    const panel = screen.getByTestId('filter-panel-content');
    expect(panel).toHaveClass('w-full');
    expect(screen.getByRole('button', { name: /filters/i })).not.toContainElement(panel);
  });

  it('forwards changes from an inner control', async () => {
    const onChange = vi.fn();
    render(<FilterPanel value={EMPTY_VALUE} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'jeans');

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_VALUE, category: 'jeans' });
  });
});
