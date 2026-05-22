/** Centralized report queue timestamp labels (no PHI). */

export function formatRelativeCollected(iso: string | null | undefined): string {
  if (!iso) return "Collected —";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Collected —";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Collected just now";
  if (diffMins < 60) return `Collected ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Collected ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Collected yesterday";
  return `Collected ${diffDays}d ago`;
}

export function formatReportTimestamp(
  iso: string | null | undefined,
  fallback: string,
): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
