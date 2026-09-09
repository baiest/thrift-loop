import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortControl } from './sort-control.js';

describe('SortControl', () => {
  it('shows the four sort options', () => {
    render(<SortControl value="newest" onChange={vi.fn()} />);

    const select = screen.getByLabelText(/sort/i);
    expect(select).toHaveValue('newest');
    expect(screen.getByRole('option', { name: 'Ending soon' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Newest' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Price: low to high' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Price: high to low' })).toBeInTheDocument();
  });

  it('shows the current value selected', () => {
    render(<SortControl value="price-desc" onChange={vi.fn()} />);

    expect(screen.getByLabelText(/sort/i)).toHaveValue('price-desc');
  });

  it('calls onChange with the wire value when the user picks an option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortControl value="newest" onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText(/sort/i), 'Ending soon');

    expect(onChange).toHaveBeenCalledWith('ending-soon');
  });
});
