function readStringField(source: Record<string, unknown>, key: string): string {
  // key always comes from the caller's own fixed key list, never request data.
  // eslint-disable-next-line security/detect-object-injection
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

export function pickStringFields<T>(body: unknown, keys: readonly (keyof T)[]): T {
  const source = (body ?? {}) as Record<string, unknown>;
  const result = {} as T;
  for (const key of keys) {
    // key is one of the caller's own fixed keys, not attacker-controlled input.
    // eslint-disable-next-line security/detect-object-injection
    result[key] = readStringField(source, String(key)) as T[keyof T];
  }
  return result;
}

/** Like {@link pickStringFields}, but only includes keys actually present in the
 * body — for PATCH endpoints, where "not sent" must be distinguishable from
 * "sent empty" so unrelated fields aren't overwritten. */
export function pickPresentStringFields<T>(body: unknown, keys: readonly (keyof T)[]): Partial<T> {
  const source = (body ?? {}) as Record<string, unknown>;
  const result: Partial<T> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      // key is one of the caller's own fixed keys, not attacker-controlled input.
      // eslint-disable-next-line security/detect-object-injection
      result[key] = readStringField(source, String(key)) as T[keyof T];
    }
  }
  return result;
}
