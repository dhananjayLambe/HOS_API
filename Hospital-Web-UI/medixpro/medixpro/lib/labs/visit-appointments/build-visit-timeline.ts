import type { LabAppointmentRow, LabTimelineEvent } from "@/lib/labs/types";
import { appointmentStatusDisplayLabel } from "@/lib/labs/visit-appointments/visit-appointment-workflow-config";

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

/** Builds activity timeline events from visit appointment workflow timestamps (newest first). */
export function buildVisitTimeline(row: LabAppointmentRow): LabTimelineEvent[] {
  const candidates: TimelineCandidate[] = [];

  if (row.statusUpdatedAt) {
    candidates.push({
      sortKey: Date.parse(row.statusUpdatedAt),
      event: {
        at: formatTimelineAt(row.statusUpdatedAt),
        label: `Status · ${appointmentStatusDisplayLabel(row.status)}`,
        detail: row.workflowHint,
      },
    });
  }

  if (row.checkedInAt) {
    candidates.push({
      sortKey: Date.parse(row.checkedInAt),
      event: {
        at: formatTimelineAt(row.checkedInAt),
        label: "Checked in",
        detail: "Patient arrived at facility",
      },
    });
  }

  if (row.completedAt) {
    candidates.push({
      sortKey: Date.parse(row.completedAt),
      event: {
        at: formatTimelineAt(row.completedAt),
        label: "Visit completed",
        detail: "Branch visit workflow finished",
      },
    });
  }

  if (row.cancelledAt && (row.status === "NO_SHOW" || row.status === "CANCELLED")) {
    candidates.push({
      sortKey: Date.parse(row.cancelledAt),
      event: {
        at: formatTimelineAt(row.cancelledAt),
        label: row.status === "NO_SHOW" ? "Marked no show" : "Appointment cancelled",
        detail: row.patientNotes ?? undefined,
      },
    });
  }

  return candidates
    .filter((c) => !Number.isNaN(c.sortKey))
    .sort((a, b) => b.sortKey - a.sortKey)
    .map((c) => c.event);
}
