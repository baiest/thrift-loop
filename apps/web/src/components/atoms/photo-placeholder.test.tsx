import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PhotoPlaceholder } from './photo-placeholder.js';

describe('PhotoPlaceholder', () => {
  it('renders as a labeled placeholder', () => {
    render(<PhotoPlaceholder />);
    expect(screen.getByLabelText('No photo')).toBeInTheDocument();
  });

  it('applies a custom aspect-ratio className', () => {
    render(<PhotoPlaceholder className="aspect-square" />);
    expect(screen.getByLabelText('No photo')).toHaveClass('aspect-square');
  });
});
