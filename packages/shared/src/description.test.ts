import { describe, expect, it } from 'vitest';
import { MAX_DESCRIPTION_LENGTH, isValidDescription } from './description.js';

describe('isValidDescription', () => {
  it('accepts a normal description', () => {
    expect(isValidDescription('Chaqueta de cuero en excelente estado, poco uso.')).toBe(true);
  });

  it('accepts a multi-line description', () => {
    expect(isValidDescription('Línea uno\nLínea dos\nLínea tres')).toBe(true);
  });

  it('accepts a description at exactly the max length', () => {
    expect(isValidDescription('a'.repeat(MAX_DESCRIPTION_LENGTH))).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidDescription('')).toBe(false);
  });

  it('rejects a string that is only whitespace', () => {
    expect(isValidDescription('   ')).toBe(false);
  });

  it('rejects a description longer than the max length', () => {
    expect(isValidDescription('a'.repeat(MAX_DESCRIPTION_LENGTH + 1))).toBe(false);
  });

  it('rejects a script-tag-shaped payload', () => {
    expect(isValidDescription('<script>alert(1)</script>')).toBe(false);
  });

  it('rejects a description with a semicolon (SQL-injection-shaped)', () => {
    expect(isValidDescription("Jeans'; DROP TABLE users;--")).toBe(false);
  });
});
