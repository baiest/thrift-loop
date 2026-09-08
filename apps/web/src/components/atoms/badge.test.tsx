import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge.js';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Good</Badge>);
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('defaults to the neutral tone', () => {
    render(<Badge>Neutral</Badge>);
    expect(screen.getByText('Neutral')).toHaveClass('bg-gray-100');
  });

  it('applies the emerald tone', () => {
    render(<Badge tone="emerald">Active</Badge>);
    expect(screen.getByText('Active')).toHaveClass('bg-emerald-100');
  });

  it('applies the amber tone', () => {
    render(<Badge tone="amber">Sold</Badge>);
    expect(screen.getByText('Sold')).toHaveClass('bg-amber-100');
  });
});
