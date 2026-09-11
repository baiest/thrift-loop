import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WinnerCelebration } from './winner-celebration.js';

describe('WinnerCelebration', () => {
  it('renders a decorative, non-interactive full-screen overlay', () => {
    render(<WinnerCelebration />);

    const overlay = screen.getByTestId('winner-celebration');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('renders multiple confetti pieces', () => {
    render(<WinnerCelebration />);

    const overlay = screen.getByTestId('winner-celebration');
    expect(overlay.children.length).toBeGreaterThan(10);
  });
});
