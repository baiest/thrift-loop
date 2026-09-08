import { describe, expect, it } from 'vitest';
import { MAX_TITLE_LENGTH, isValidTitle } from './title.js';

describe('isValidTitle', () => {
  it('accepts a normal title', () => {
    expect(isValidTitle('Chaqueta de cuero')).toBe(true);
  });

  it('accepts letters with Spanish accents and ñ', () => {
    expect(isValidTitle('Pantalón niño')).toBe(true);
  });

  it('accepts digits and basic punctuation', () => {
    expect(isValidTitle('Jeans talla 32, marca "Levi\'s" (nuevos) #1')).toBe(true);
  });

  it('accepts a title at exactly the max length', () => {
    expect(isValidTitle('a'.repeat(MAX_TITLE_LENGTH))).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidTitle('')).toBe(false);
  });

  it('rejects a string that is only whitespace', () => {
    expect(isValidTitle('   ')).toBe(false);
  });

  it('rejects a title longer than the max length', () => {
    expect(isValidTitle('a'.repeat(MAX_TITLE_LENGTH + 1))).toBe(false);
  });

  it('rejects a script-tag-shaped payload', () => {
    expect(isValidTitle('<script>alert(1)</script>')).toBe(false);
  });

  it('rejects a title with a semicolon (SQL-injection-shaped)', () => {
    expect(isValidTitle("Jeans'; DROP TABLE users;--")).toBe(false);
  });

  it('rejects a title with a null byte', () => {
    expect(isValidTitle(`Jeans${String.fromCharCode(0)}`)).toBe(false);
  });
});
