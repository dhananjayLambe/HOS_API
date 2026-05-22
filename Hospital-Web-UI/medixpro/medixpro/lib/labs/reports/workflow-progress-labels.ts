import { progressLabelTextClassName } from "@/lib/labs/reports/queue-tokens";

export type GroupProgressParts = {
  uploadedCount: number;
  totalCount: number;
  pendingCount: number;
  completedCount: number;
};

export function formatGroupProgressLabel(parts: GroupProgressParts): string {
  const { uploadedCount, totalCount, pendingCount } = parts;
  if (totalCount <= 0) return "";
  const main = `${uploadedCount} of ${totalCount} report${totalCount === 1 ? "" : "s"} uploaded`;
  if (pendingCount > 0 && pendingCount !== totalCount) {
    return `${main} · ${pendingCount} pending`;
  }
  return main;
}

export function formatGroupProgressSecondary(parts: GroupProgressParts): string | null {
  if (parts.completedCount <= 0) return null;
  return `${parts.completedCount} completed`;
}

export { progressLabelTextClassName };
