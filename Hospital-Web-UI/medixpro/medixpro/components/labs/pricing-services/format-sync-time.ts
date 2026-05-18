export function formatRelativeSyncTime(iso: string | null): string {
  if (!iso) return "Sync time unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Sync time unknown";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Last synced just now";
  if (mins < 60) return `Last synced ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last synced ${hours}h ago`;
  return `Last synced ${new Date(iso).toLocaleDateString()}`;
}
