import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from './icon.js';

describe('Icon', () => {
  it('renders a known icon as an svg', () => {
    render(<Icon name="compass" aria-label="compass" />);
    expect(screen.getByLabelText('compass').tagName).toBe('svg');
  });

  it('renders a different path for a different icon', () => {
    const { container: compassContainer } = render(<Icon name="compass" />);
    const { container: tagContainer } = render(<Icon name="tag" />);

    expect(compassContainer.querySelector('path')?.getAttribute('d')).not.toBe(
      tagContainer.querySelector('path')?.getAttribute('d'),
    );
  });

  it('applies a custom className', () => {
    render(<Icon name="user" className="h-5 w-5" aria-label="user" />);
    expect(screen.getByLabelText('user')).toHaveClass('h-5 w-5');
  });

  it('is hidden from assistive tech when it carries no label', () => {
    const { container } = render(<Icon name="log-out" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the bell icon', () => {
    render(<Icon name="bell" aria-label="notifications" />);
    expect(screen.getByLabelText('notifications').tagName).toBe('svg');
  });

  it('renders the alert-circle icon', () => {
    render(<Icon name="alert-circle" aria-label="alert" />);
    expect(screen.getByLabelText('alert').tagName).toBe('svg');
  });

  it('renders the check-circle icon', () => {
    render(<Icon name="check-circle" aria-label="check" />);
    expect(screen.getByLabelText('check').tagName).toBe('svg');
  });
});
