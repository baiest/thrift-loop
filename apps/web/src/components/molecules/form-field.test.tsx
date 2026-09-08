import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './form-field.js';

describe('FormField', () => {
  it('renders the label associated with the input', () => {
    render(
      <FormField id="phone" label="Phone number">
        <input id="phone" />
      </FormField>,
    );

    expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
  });

  it('renders the error message when given one', () => {
    render(
      <FormField id="phone" label="Phone number" error="Invalid phone">
        <input id="phone" />
      </FormField>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid phone');
  });

  it('renders no error when none is given', () => {
    render(
      <FormField id="phone" label="Phone number">
        <input id="phone" />
      </FormField>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
