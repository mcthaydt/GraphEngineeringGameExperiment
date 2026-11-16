/** Returns the value, or throws if it is missing: for things that are always there by construction. */
export function must<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`Missing ${what}`);
  return value;
}
