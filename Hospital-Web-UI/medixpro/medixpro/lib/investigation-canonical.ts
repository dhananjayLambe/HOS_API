import { INVESTIGATION_MASTER_ITEMS } from "@/data/consultation-section-data";

/** Alphanumeric-only key for fuzzy name/id matching (aligned with package lookup). */
export function stripInvestigationKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Maps strip-keys (name, alias, service_id, parenthetical abbreviations) → canonical `service_id`
 * from the static master list so live API UUIDs and variant labels dedupe correctly.
 */
const STRIP_KEY_TO_CANONICAL: Map<string, string> = (() => {
  const m = new Map<string, string>();
  const add = (raw: string, canon: string) => {
    const k = stripInvestigationKey(raw);
    if (k.length >= 2) m.set(k, canon);
  };
  for (const item of INVESTIGATION_MASTER_ITEMS) {
    const c = item.service_id;
    add(item.service_id, c);
    add(item.name, c);
    item.aliases?.forEach((a) => add(a, c));
    const paren = item.name.match(/\(([^)]+)\)/);
    if (paren?.[1]) add(paren[1], c);
  }
  return m;
})();

function lookupCanonFromStripKey(stripKey: string): string | null {
  if (stripKey.length < 2) return null;
  return STRIP_KEY_TO_CANONICAL.get(stripKey) ?? null;
}

/**
 * Stable key for deduping investigations: same catalog test from API UUID + label "CBC"
 * matches static `service_id` `cbc` and matches "Complete Blood Count (CBC)" via aliases/parens.
 */
export function canonicalInvestigationKey(serviceId: string, displayLabel: string): string {
  const master = INVESTIGATION_MASTER_ITEMS.find((x) => x.service_id === serviceId);
  if (master) return master.service_id;

  const label = displayLabel.trim();

  const tryResolve = (raw: string): string | null => {
    const k = stripInvestigationKey(raw);
    return lookupCanonFromStripKey(k);
  };

  if (label) {
    const direct = tryResolve(label);
    if (direct) return direct;

    for (const match of label.matchAll(/\(([^)]+)\)/g)) {
      const inner = tryResolve(match[1]);
      if (inner) return inner;
    }

    const tokens = label
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2);
    for (const t of tokens) {
      const inner = tryResolve(t);
      if (inner) return inner;
    }
  }

  const fromId = tryResolve(serviceId);
  if (fromId) return fromId;

  return serviceId;
}

/** Drop duplicate suggestion rows that refer to the same catalog test under different API ids. */
export function dedupeInvestigationSuggestionsByCanonical<T extends { id: string; name: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = canonicalInvestigationKey(it.id, it.name);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/** Same as suggestions dedupe, for search dropdown rows (`label` instead of `name`). */
export function dedupeInvestigationSearchTests<T extends { id: string; label: string }>(
  tests: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of tests) {
    const k = canonicalInvestigationKey(t.id, t.label);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
