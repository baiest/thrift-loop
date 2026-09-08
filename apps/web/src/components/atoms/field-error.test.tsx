import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldError } from './field-error.js';

describe('FieldError', () => {
  it('renders the message when given one', () => {
    render(<FieldError message="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders nothing when there is no message', () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });
});
