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
    expect(screen.getByText('Neutral')).toHaveClass('bg-hairline');
  });

  it('applies the condition tone', () => {
    render(<Badge tone="condition">Very good</Badge>);
    expect(screen.getByText('Very good')).toHaveClass('bg-linen');
  });

  it('applies the live tone', () => {
    render(<Badge tone="live">Live</Badge>);
    expect(screen.getByText('Live')).toHaveClass('bg-brand-100');
  });

  it('applies the ended tone', () => {
    render(<Badge tone="ended">Ended</Badge>);
    expect(screen.getByText('Ended')).toHaveClass('border-hairline');
  });

  it('applies the draft tone', () => {
    render(<Badge tone="draft">Draft</Badge>);
    expect(screen.getByText('Draft')).toHaveClass('bg-amber-100');
  });

  it('applies the own tone', () => {
    render(<Badge tone="own">Yours</Badge>);
    expect(screen.getByText('Yours')).toHaveClass('border-ink');
  });
});
