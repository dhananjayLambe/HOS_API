/**
 * Canonical package key for lookups: API uses snake_case `lineage_code`;
 * static data may use kebab-case `bundle_id`. Normalize at boundaries only.
 */
export function normalizePackageKey(key: string): string {
  return key.replace(/-/g, "_").toLowerCase();
}
