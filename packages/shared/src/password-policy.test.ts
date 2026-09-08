import { describe, expect, it } from 'vitest';
import { isPasswordValid, passwordStrength, validatePassword } from './password-policy.js';

describe('validatePassword', () => {
  it('returns no violations for a valid password', () => {
    expect(validatePassword('Abcdefg1')).toEqual([]);
  });

  it('reports minLength when too short', () => {
    expect(validatePassword('Ab1')).toContain('minLength');
  });

  it('reports uppercase when missing', () => {
    expect(validatePassword('abcdefg1')).toContain('uppercase');
  });

  it('reports lowercase when missing', () => {
    expect(validatePassword('ABCDEFG1')).toContain('lowercase');
  });

  it('reports digit when missing', () => {
    expect(validatePassword('Abcdefgh')).toContain('digit');
  });

  it('reports every violated rule at once', () => {
    expect(validatePassword('abc')).toEqual(
      expect.arrayContaining(['minLength', 'uppercase', 'digit']),
    );
  });
});

describe('isPasswordValid', () => {
  it('is true when there are no violations', () => {
    expect(isPasswordValid('Abcdefg1')).toBe(true);
  });

  it('is false when any rule is violated', () => {
    expect(isPasswordValid('abcdefg1')).toBe(false);
  });
});

describe('passwordStrength', () => {
  it('scores an empty password as 0', () => {
    expect(passwordStrength('')).toBe(0);
  });

  it('scores a short lowercase-only password low', () => {
    expect(passwordStrength('abc')).toBe(0);
  });

  it('scores a valid minimal password as 3', () => {
    expect(passwordStrength('Abcdefg1')).toBe(3);
  });

  it('scores a long password with all char classes at the max of 4', () => {
    expect(passwordStrength('Abcdefghij1!')).toBe(4);
  });

  it('never exceeds the max score', () => {
    expect(passwordStrength('Abcdefghij1!'.repeat(5))).toBe(4);
  });
});
