import type { LabCollectionRow, LabTimelineEvent } from "@/lib/labs/types";

function formatTimelineAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type TimelineCandidate = {
  sortKey: number;
  event: LabTimelineEvent;
};

/** Builds activity timeline events from list-row workflow timestamps (newest first). */
export function buildCollectionTimeline(row: LabCollectionRow): LabTimelineEvent[] {
  const candidates: TimelineCandidate[] = [];

  if (row.assignedAt) {
    const note = row.assignmentNote.trim();
    candidates.push({
      sortKey: Date.parse(row.assignedAt),
      event: {
        at: formatTimelineAt(row.assignedAt),
        label: "Collection assigned",
        detail: note || undefined,
        actor: row.assigneeName ? `Phlebotomist · ${row.assigneeName}` : undefined,
      },
    });
  }

  if (row.inProgressAt) {
    candidates.push({
      sortKey: Date.parse(row.inProgressAt),
      event: {
        at: formatTimelineAt(row.inProgressAt),
        label: "Collection started",
        detail: "Field collection in progress",
      },
    });
  }

  if (row.collectedAt) {
    candidates.push({
      sortKey: Date.parse(row.collectedAt),
      event: {
        at: formatTimelineAt(row.collectedAt),
        label: "Sample collected",
        detail: "Samples received from home visit",
      },
    });
  }

  if (row.failedAt) {
    const reason = row.internalNotes?.trim();
    candidates.push({
      sortKey: Date.parse(row.failedAt),
      event: {
        at: formatTimelineAt(row.failedAt),
        label: "Collection failed",
        detail: reason || undefined,
      },
    });
  }

  return candidates
    .filter((c) => !Number.isNaN(c.sortKey))
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((c) => c.event);
}
