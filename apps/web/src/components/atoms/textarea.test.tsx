import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea.js';

describe('Textarea', () => {
  it('renders the given value', () => {
    render(<Textarea id="description" value="Hello" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveValue('Hello');
  });

  it('calls onChange with the new value as the user types', async () => {
    const onChange = vi.fn();
    render(<Textarea id="description" value="" onChange={onChange} />);

    await userEvent.type(screen.getByRole('textbox'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('calls onBlur when it loses focus', async () => {
    const onBlur = vi.fn();
    render(<Textarea id="description" value="" onChange={vi.fn()} onBlur={onBlur} />);

    const textarea = screen.getByRole('textbox');
    textarea.focus();
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalledOnce();
  });

  it('marks the textarea as invalid via aria-invalid', () => {
    render(<Textarea id="description" value="" onChange={vi.fn()} invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('accepts multi-line text', () => {
    const onChange = vi.fn();
    render(<Textarea id="description" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a\nb' } });

    expect(onChange).toHaveBeenCalledWith('a\nb');
  });

  it('shows a character-count hint when maxLength is given', () => {
    render(<Textarea id="description" value="Chaqueta" onChange={vi.fn()} maxLength={500} />);
    expect(screen.getByText('8/500')).toBeInTheDocument();
  });
});
