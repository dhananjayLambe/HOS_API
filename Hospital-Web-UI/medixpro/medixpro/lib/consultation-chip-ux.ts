import type { ConsultationSectionType } from "@/lib/consultation-types";

/** Middle column scroll root on Start Consultation (not the full page). */
export const CONSULTATION_CONTAINER_ID = "consultation-container";

/**
 * Mark section search inputs so Tab navigation can find them without relying on ref identity
 * (callback refs + re-renders often break `ref === document.activeElement` checks).
 */
export const CONSULTATION_TAB_SECTION_DATA_ATTR = "data-consultation-tab-section";

/** Primary clinical sections: Tab cycles search focus in this order (when each is mounted). */
export const CONSULTATION_TAB_SECTION_ORDER = [
  "symptoms",
  "findings",
  "diagnosis",
  "medicines",
] as const satisfies readonly ConsultationSectionType[];

export type ConsultationTabSectionKey =
  (typeof CONSULTATION_TAB_SECTION_ORDER)[number];

export function isConsultationTabSectionKey(
  key: string | null | undefined
): key is ConsultationTabSectionKey {
  return (
    key != null &&
    (CONSULTATION_TAB_SECTION_ORDER as readonly string[]).includes(key)
  );
}

/** Keep the active chip first; preserve relative order of the rest. */
export function reorderItemsByActiveId<T extends { id: string }>(
  items: T[],
  activeId: string | null
): T[] {
  if (!activeId) return items;
  const active = items.find((i) => i.id === activeId);
  if (!active) return items;
  const rest = items.filter((i) => i.id !== activeId);
  return [active, ...rest];
}
