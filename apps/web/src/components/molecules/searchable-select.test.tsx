import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from './searchable-select.js';

const CITIES = ['Bogotá D.C.', 'Medellín', 'Cali', 'Barranquilla'] as const;

describe('SearchableSelect', () => {
  it('shows all options when the input is focused with no query', async () => {
    render(<SearchableSelect id="city" options={CITIES} value="" onChange={vi.fn()} />);

    await userEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Medellín')).toBeInTheDocument();
  });

  it('filters options as the user types', async () => {
    render(<SearchableSelect id="city" options={CITIES} value="" onChange={vi.fn()} />);

    await userEvent.type(screen.getByRole('combobox'), 'cal');

    expect(screen.getByText('Cali')).toBeInTheDocument();
    expect(screen.queryByText('Medellín')).not.toBeInTheDocument();
  });

  it('calls onChange with the selected option', async () => {
    const onChange = vi.fn();
    render(<SearchableSelect id="city" options={CITIES} value="" onChange={onChange} />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByText('Cali'));

    expect(onChange).toHaveBeenCalledWith('Cali');
  });

  it('clears the selected value while the user edits the query', async () => {
    const onChange = vi.fn();
    render(<SearchableSelect id="city" options={CITIES} value="Cali" onChange={onChange} />);

    await userEvent.type(screen.getByRole('combobox'), 'x');

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('syncs its displayed value when the value prop changes externally', () => {
    const { rerender } = render(
      <SearchableSelect id="city" options={CITIES} value="" onChange={vi.fn()} />,
    );

    rerender(<SearchableSelect id="city" options={CITIES} value="Cali" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toHaveValue('Cali');
  });

  it('calls onBlur when the input loses focus', async () => {
    const onBlur = vi.fn();
    render(
      <SearchableSelect id="city" options={CITIES} value="" onChange={vi.fn()} onBlur={onBlur} />,
    );

    screen.getByRole('combobox').focus();
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalledOnce();
  });
});
