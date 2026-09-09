import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './skeleton.js';

describe('Skeleton', () => {
  it('renders a shimmering placeholder block', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
    expect(screen.getByTestId('skeleton')).toHaveClass('bg-linen');
  });

  it('is hidden from assistive tech', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('accepts a custom className for sizing', () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-24" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('h-4', 'w-24');
  });
});
