import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthMeter } from './password-strength-meter.js';

describe('PasswordStrengthMeter', () => {
  it('renders nothing for an empty password', () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('labels a short weak password as "Too weak" or "Weak"', () => {
    render(<PasswordStrengthMeter password="abc" />);
    expect(screen.getByTestId('password-strength-meter')).toHaveTextContent(/weak/i);
  });

  it('labels a strong password as "Strong"', () => {
    render(<PasswordStrengthMeter password="Abcdefghij1!" />);
    expect(screen.getByTestId('password-strength-meter')).toHaveTextContent('Strong');
  });

  it('labels a valid minimal password as "Good"', () => {
    render(<PasswordStrengthMeter password="Abcdefg1" />);
    expect(screen.getByTestId('password-strength-meter')).toHaveTextContent('Good');
  });
});
