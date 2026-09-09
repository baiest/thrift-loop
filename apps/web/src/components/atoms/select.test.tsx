import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './select.js';

const OPTIONS = [
  { value: 'jeans', label: 'Jeans' },
  { value: 'boots', label: 'Boots' },
];

describe('Select', () => {
  it('renders every option plus a placeholder', () => {
    render(<Select id="category" value="" options={OPTIONS} onChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Jeans')).toBeInTheDocument();
    expect(screen.getByText('Boots')).toBeInTheDocument();
  });

  it('reflects the given value', () => {
    render(<Select id="category" value="boots" options={OPTIONS} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('boots');
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    render(<Select id="category" value="" options={OPTIONS} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'boots');

    expect(onChange).toHaveBeenCalledWith('boots');
  });

  it('marks the select as invalid via aria-invalid', () => {
    render(<Select id="category" value="" options={OPTIONS} onChange={vi.fn()} invalid />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('hides the native arrow and shows our own chevron instead', () => {
    const { container } = render(
      <Select id="category" value="" options={OPTIONS} onChange={vi.fn()} />,
    );
    expect(screen.getByRole('combobox')).toHaveClass('appearance-none');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
