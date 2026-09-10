import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NotificationItemSkeleton } from './notification-item-skeleton.js';

describe('NotificationItemSkeleton', () => {
  it('renders a placeholder shaped like a notification row, not literal loading text', () => {
    render(<NotificationItemSkeleton />);
    expect(screen.getByLabelText('Loading notification')).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
