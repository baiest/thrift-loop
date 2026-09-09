import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from './stepper.js';

const STEPS = ['Photos', 'Details', 'Pricing', 'Schedule', 'Review'];

describe('Stepper', () => {
  it('renders every step label', () => {
    render(<Stepper steps={STEPS} currentIndex={0} />);
    for (const label of STEPS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks the current step', () => {
    render(<Stepper steps={STEPS} currentIndex={2} />);
    expect(screen.getByText('Pricing').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'current',
    );
  });

  it('marks earlier steps as completed', () => {
    render(<Stepper steps={STEPS} currentIndex={2} />);
    expect(screen.getByText('Photos').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'completed',
    );
    expect(screen.getByText('Details').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'completed',
    );
  });

  it('marks later steps as upcoming', () => {
    render(<Stepper steps={STEPS} currentIndex={2} />);
    expect(screen.getByText('Schedule').closest('[data-state]')).toHaveAttribute(
      'data-state',
      'upcoming',
    );
  });
});
