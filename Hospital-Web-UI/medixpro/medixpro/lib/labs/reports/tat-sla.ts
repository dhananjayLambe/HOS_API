import type { UrgencyLevel } from "@/lib/labs/constants/urgency";

/** MVP client SLA hours until backend exposes `tat_breached`. */
export const TAT_SLA_HOURS: Record<UrgencyLevel, number> = {
  STAT: 4,
  URGENT: 6,
  ROUTINE: 24,
};

export function isTatBreached(
  slaAnchorIso: string | null | undefined,
  urgency: UrgencyLevel = "ROUTINE",
  nowMs: number = Date.now(),
): boolean {
  if (!slaAnchorIso) return false;
  const anchor = new Date(slaAnchorIso);
  if (Number.isNaN(anchor.getTime())) return false;
  const hours = TAT_SLA_HOURS[urgency] ?? TAT_SLA_HOURS.ROUTINE;
  return nowMs - anchor.getTime() > hours * 60 * 60 * 1000;
}
