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

const GENERIC_STATUS_LABEL_PREFIX = "Status · ";

function dedupeAuditTimelineCandidates(candidates: TimelineCandidate[]): LabTimelineEvent[] {
  const valid = candidates.filter((c) => !Number.isNaN(c.sortKey));
  const sorted = [...valid].sort((a, b) => b.sortKey - a.sortKey);
  const seen = new Set<string>();

  return sorted
    .filter((c) => {
      const dedupeKey = `${c.sortKey}|${c.event.label}`;
      if (seen.has(dedupeKey)) return false;

      const isGenericStatus = c.event.label.startsWith(GENERIC_STATUS_LABEL_PREFIX);
      const hasSpecificAtSameTime = isGenericStatus
        && sorted.some(
          (other) =>
            other.sortKey === c.sortKey
            && !other.event.label.startsWith(GENERIC_STATUS_LABEL_PREFIX),
        );
      if (hasSpecificAtSameTime) return false;

      seen.add(dedupeKey);
      return true;
    })
    .map((c) => c.event);
}

function timelineFromBackend(row: LabAppointmentRow): LabTimelineEvent[] {
  const events = row.timelineEvents ?? [];
  if (!events.length) {
    return [];
  }
  return [...events]
    .sort((a, b) => b.event_order - a.event_order)
    .map((item) => ({
      at: formatTimelineAt(item.timestamp),
      label: item.label,
      detail: item.detail?.trim() || undefined,
    }));
}

function timelineFromAuditFields(row: LabAppointmentRow): LabTimelineEvent[] {
  const candidates: TimelineCandidate[] = [];

  if (row.confirmedAt) {
    candidates.push({
      sortKey: Date.parse(row.confirmedAt),
      event: {
        at: formatTimelineAt(row.confirmedAt),
        label: "Appointment confirmed",
        detail: undefined,
      },
    });
  }

  if (row.checkedInAt) {
    candidates.push({
      sortKey: Date.parse(row.checkedInAt),
      event: {
        at: formatTimelineAt(row.checkedInAt),
        label: "Patient checked in",
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

  if (row.noShowAt) {
    candidates.push({
      sortKey: Date.parse(row.noShowAt),
      event: {
        at: formatTimelineAt(row.noShowAt),
        label: "Patient did not arrive",
        detail: row.patientNotes ?? undefined,
      },
    });
  }

  if (row.cancelledAt && row.status === "CANCELLED") {
    candidates.push({
      sortKey: Date.parse(row.cancelledAt),
      event: {
        at: formatTimelineAt(row.cancelledAt),
        label: "Appointment cancelled",
        detail: row.patientNotes ?? undefined,
      },
    });
  }

  if (row.statusUpdatedAt) {
    const sortKey = Date.parse(row.statusUpdatedAt);
    const hasSpecificAtSameTime = candidates.some((c) => c.sortKey === sortKey);
    if (!hasSpecificAtSameTime) {
      candidates.push({
        sortKey,
        event: {
          at: formatTimelineAt(row.statusUpdatedAt),
          label: `${GENERIC_STATUS_LABEL_PREFIX}${appointmentStatusDisplayLabel(row.status)}`,
          detail: row.workflowHint,
        },
      });
    }
  }

  return dedupeAuditTimelineCandidates(candidates);
}

/** Builds activity timeline from API timeline_events, with audit-field fallback. */
export function buildVisitTimeline(row: LabAppointmentRow): LabTimelineEvent[] {
  const fromApi = timelineFromBackend(row);
  if (fromApi.length) {
    return fromApi;
  }
  return timelineFromAuditFields(row);
}
