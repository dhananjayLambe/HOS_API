/** Human-facing copy helpers — internal enum names never reach UI. */

export function formatMissingReports(count: number): string {
  if (count <= 0) return "All reports uploaded";
  if (count === 1) return "1 report pending";
  return `${count} reports pending`;
}
