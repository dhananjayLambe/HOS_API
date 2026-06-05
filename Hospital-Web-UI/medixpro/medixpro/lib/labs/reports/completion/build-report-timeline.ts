import type { ReportTimelineEventApiItem } from "@/lib/labs/reports/api/report-api-types";
import { formatReportTimestamp } from "@/lib/labs/reports/format-report-timestamp";

export type ReportTimelineEventColor = "gray" | "blue" | "purple" | "green" | "red" | "orange";

export type ReportTimelineEventViewModel = {
  id: string;
  label: string;
  atLabel: string;
  detail?: string;
  color: ReportTimelineEventColor;
};

const EVENT_LABEL: Record<string, string> = {
  collected: "Collected",
  upload_completed: "Report Uploaded",
  artifact_reuploaded: "Report Re-uploaded",
  ready_to_send: "Ready To Send",
  sent: "Sent To Patient",
  delivered: "Delivered",
  failed: "Delivery Failed",
  attention_required: "Attention Required",
};

const EVENT_COLOR: Record<string, ReportTimelineEventColor> = {
  collected: "gray",
  upload_completed: "blue",
  artifact_reuploaded: "blue",
  ready_to_send: "purple",
  sent: "green",
  delivered: "green",
  failed: "red",
  attention_required: "orange",
};

const DOT_COLOR: Record<ReportTimelineEventColor, string> = {
  gray: "#9CA3AF",
  blue: "#3B82F6",
  purple: "#7C5CFC",
  green: "#10B981",
  red: "#EF4444",
  orange: "#F59E0B",
};

export function timelineDotColor(color: ReportTimelineEventColor): string {
  return DOT_COLOR[color];
}

export function buildReportTimelineEvents(
  events: ReportTimelineEventApiItem[],
): ReportTimelineEventViewModel[] {
  return [...events]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((event, index) => mapTimelineEvent(event, index));
}

function mapTimelineEvent(
  event: ReportTimelineEventApiItem,
  index: number,
): ReportTimelineEventViewModel {
  const eventType = event.event_type.trim().toLowerCase();
  const label = EVENT_LABEL[eventType] ?? humanizeEventType(eventType);
  const color = EVENT_COLOR[eventType] ?? "gray";
  const message = event.message?.trim() || undefined;
  const actorName = event.actor_name?.trim() || undefined;
  let detail: string | undefined;
  if (message) {
    detail = message;
  } else if (actorName) {
    detail =
      eventType === "upload_completed" || eventType === "artifact_reuploaded"
        ? `Uploaded by ${actorName}`
        : actorName;
  }

  return {
    id: `${eventType}-${event.timestamp}-${index}`,
    label,
    atLabel: formatReportTimestamp(event.timestamp, event.timestamp),
    detail,
    color,
  };
}

function humanizeEventType(eventType: string): string {
  return eventType
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
