/** Minutes remaining until PENDING assignment SLA auto-reject (Phase 1: 60 min). */
export const LAB_ASSIGNMENT_SLA_MINUTES = 60;

export function minutesUntilSlaDeadline(assignedAtIso: string | null | undefined): number | null {
  if (!assignedAtIso) return null;
  const assigned = new Date(assignedAtIso);
  if (Number.isNaN(assigned.getTime())) return null;
  const deadline = assigned.getTime() + LAB_ASSIGNMENT_SLA_MINUTES * 60 * 1000;
  const remainingMs = deadline - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 60_000));
}

export function isAutoRejectedReason(reason: string | null | undefined): boolean {
  return Boolean(reason?.startsWith("Auto-rejected"));
}
