import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsBar } from './results-bar.js';

describe('ResultsBar', () => {
  it('shows the plural item count', () => {
    render(<ResultsBar count={48} sort="newest" onSortChange={vi.fn()} />);

    expect(screen.getByText('48 items available to bid')).toBeInTheDocument();
  });

  it('shows the singular item count for exactly one', () => {
    render(<ResultsBar count={1} sort="newest" onSortChange={vi.fn()} />);

    expect(screen.getByText('1 item available to bid')).toBeInTheDocument();
  });

  it('shows the zero count', () => {
    render(<ResultsBar count={0} sort="newest" onSortChange={vi.fn()} />);

    expect(screen.getByText('0 items available to bid')).toBeInTheDocument();
  });

  it('renders the sort control with the current value', () => {
    render(<ResultsBar count={5} sort="price-asc" onSortChange={vi.fn()} />);

    expect(screen.getByLabelText(/sort/i)).toHaveValue('price-asc');
  });
});
