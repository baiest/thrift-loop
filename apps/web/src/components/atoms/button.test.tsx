import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button.js';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Continue</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('defaults to type="button"', () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
