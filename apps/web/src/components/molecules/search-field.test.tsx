import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './search-field.js';

describe('SearchField', () => {
  it('renders the given value and placeholder', () => {
    render(<SearchField value="jacket" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/search jackets, denim/i)).toHaveValue('jacket');
  });

  it('calls onChange as the user types', async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('searchbox'), 'b');

    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('renders a search icon', () => {
    render(<SearchField value="" onChange={vi.fn()} />);
    expect(screen.getByRole('searchbox').parentElement?.querySelector('svg')).toBeInTheDocument();
  });
});
