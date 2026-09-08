/**
 * Like `pickStringFields` but for `req.query`, which Express may parse as a
 * string, string[], or nested object depending on how the client shapes the
 * querystring (parameter-pollution style input, e.g. `?search=a&search=b`).
 * Anything that isn't a plain string is treated as absent rather than
 * coerced, so a malformed query can't smuggle unexpected shapes downstream.
 */
export function pickQueryStrings<T>(
  query: unknown,
  keys: readonly (keyof T)[],
): Partial<Record<keyof T, string>> {
  const source = (query ?? {}) as Record<string, unknown>;
  const result: Partial<Record<keyof T, string>> = {};
  for (const key of keys) {
    // key is one of the caller's own fixed keys, not attacker-controlled input.
    const value = source[String(key)];
    if (typeof value === 'string') {
      // eslint-disable-next-line security/detect-object-injection
      result[key] = value;
    }
  }
  return result;
}
