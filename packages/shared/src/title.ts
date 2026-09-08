export const MAX_TITLE_LENGTH = 80;

// Whitelist, not a blacklist: letters (incl. Spanish accents/ñ via \p{L}),
// digits, spaces, and a small set of ordinary punctuation. Anything else
// (script tags, SQL-shaped punctuation, control/null bytes, etc.) is rejected.
export const TITLE_PATTERN = /^[\p{L}\p{N}\s.,'"()#/-]+$/u;

export function isValidTitle(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_TITLE_LENGTH && TITLE_PATTERN.test(trimmed);
}
