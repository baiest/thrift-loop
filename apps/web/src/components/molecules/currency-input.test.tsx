import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyInput } from './currency-input.js';

describe('CurrencyInput', () => {
  it('shows the value formatted as Colombian pesos', () => {
    render(<CurrencyInput id="price" value="120000" onChange={vi.fn()} />);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- tsc disagrees with the linter here; the cast is required to access `.value`.
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toMatch(/\$\s?120\.000/);
  });

  it('shows an empty display for an empty value', () => {
    render(<CurrencyInput id="price" value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('calls onChange with the raw digits as the user types', async () => {
    const onChange = vi.fn();
    render(<CurrencyInput id="price" value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), '5');

    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('strips non-digit characters before calling onChange', async () => {
    const onChange = vi.fn();
    render(<CurrencyInput id="price" value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'a');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('calls onChange with an empty string when the field is cleared', async () => {
    const onChange = vi.fn();
    render(<CurrencyInput id="price" value="120000" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.clear(input);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('marks the input as invalid via aria-invalid', () => {
    render(<CurrencyInput id="price" value="" onChange={vi.fn()} invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders no label of its own, leaving that to the wrapping FormField', () => {
    render(<CurrencyInput id="price" value="" onChange={vi.fn()} />);
    expect(document.querySelector('label')).not.toBeInTheDocument();
  });
});
