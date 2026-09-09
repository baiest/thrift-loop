import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyInput } from './currency-input.js';

describe('CurrencyInput', () => {
  it('shows the value formatted as Colombian pesos', () => {
    render(<CurrencyInput id="price" value="120000" onChange={vi.fn()} />);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc disagrees with the linter here; the cast is required to access `.value`.
    const input = screen.getByLabelText('Price') as HTMLInputElement;
    expect(input.value).toMatch(/\$\s?120\.000/);
  });

  it('shows an empty display for an empty value', () => {
    render(<CurrencyInput id="price" value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Price')).toHaveValue('');
  });

  it('calls onChange with the raw digits as the user types', async () => {
    const onChange = vi.fn();
    render(<CurrencyInput id="price" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Price'), '5');

    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('strips non-digit characters before calling onChange', async () => {
    const onChange = vi.fn();
    render(<CurrencyInput id="price" value="" onChange={onChange} />);

    const input = screen.getByLabelText('Price');
    await userEvent.type(input, 'a');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks the input as invalid via aria-invalid', () => {
    render(<CurrencyInput id="price" value="" onChange={vi.fn()} invalid />);
    expect(screen.getByLabelText('Price')).toHaveAttribute('aria-invalid', 'true');
  });
});
