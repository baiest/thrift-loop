import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnreadBadge } from './unread-badge.js';

describe('UnreadBadge', () => {
  it('renders nothing when the count is zero', () => {
    const { container } = render(<UnreadBadge count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the count is negative', () => {
    const { container } = render(<UnreadBadge count={-1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the exact count under the cap', () => {
    render(<UnreadBadge count={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('caps the display at 9+', () => {
    render(<UnreadBadge count={42} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows exactly 9 uncapped', () => {
    render(<UnreadBadge count={9} />);
    expect(screen.getByText('9')).toBeInTheDocument();
  });
});
