import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthHero } from './auth-hero.js';

describe('AuthHero', () => {
  it('renders the given headline and subtext', () => {
    render(<AuthHero headline="Join the circle." subtext="Buy pieces you'll actually wear." />);

    expect(screen.getByText('Join the circle.')).toBeInTheDocument();
    expect(screen.getByText("Buy pieces you'll actually wear.")).toBeInTheDocument();
  });

  it('hides its decorative auction-card collage from assistive tech', () => {
    const { container } = render(<AuthHero headline="Headline" subtext="Subtext" />);

    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).not.toBeNull();
  });
});
