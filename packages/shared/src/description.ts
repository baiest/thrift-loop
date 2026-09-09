import { TITLE_PATTERN } from './title.js';

export const MAX_DESCRIPTION_LENGTH = 500;

export function isValidDescription(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 && trimmed.length <= MAX_DESCRIPTION_LENGTH && TITLE_PATTERN.test(trimmed)
  );
}
