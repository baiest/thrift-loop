export const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_STRONG_LENGTH = 12;
const MAX_STRENGTH_SCORE = 4;

export type PasswordRule = 'minLength' | 'uppercase' | 'lowercase' | 'digit';

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const DIGIT_PATTERN = /\d/;
const SYMBOL_PATTERN = /[^A-Za-z0-9]/;

export function validatePassword(password: string): PasswordRule[] {
  const violations: PasswordRule[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    violations.push('minLength');
  }
  if (!UPPERCASE_PATTERN.test(password)) {
    violations.push('uppercase');
  }
  if (!LOWERCASE_PATTERN.test(password)) {
    violations.push('lowercase');
  }
  if (!DIGIT_PATTERN.test(password)) {
    violations.push('digit');
  }
  return violations;
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0;
}

export function passwordStrength(password: string): number {
  const criteria = [
    password.length >= PASSWORD_MIN_LENGTH,
    password.length >= PASSWORD_STRONG_LENGTH,
    UPPERCASE_PATTERN.test(password) && LOWERCASE_PATTERN.test(password),
    DIGIT_PATTERN.test(password),
    SYMBOL_PATTERN.test(password),
  ];
  const metCount = criteria.filter(Boolean).length;
  return Math.min(metCount, MAX_STRENGTH_SCORE);
}
