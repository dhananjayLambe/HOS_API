import { describe, expect, it } from "vitest";
import { buildReportTimelineEvents } from "@/lib/labs/reports/completion/build-report-timeline";
import type { ReportTimelineEventApiItem } from "@/lib/labs/reports/api/report-api-types";

describe("buildReportTimelineEvents", () => {
  it("maps backend event types to UI labels in ascending order", () => {
    const events: ReportTimelineEventApiItem[] = [
      {
        event_type: "ready_to_send",
        timestamp: "2026-06-05T10:46:00Z",
        actor_name: "",
        message: "",
      },
      {
        event_type: "collected",
        timestamp: "2026-06-05T09:20:00Z",
        actor_name: "",
        message: "",
      },
      {
        event_type: "upload_completed",
        timestamp: "2026-06-05T10:15:00Z",
        actor_name: "labmax1",
        message: "Uploaded report.pdf",
      },
    ];

    const mapped = buildReportTimelineEvents(events);
    expect(mapped.map((event) => event.label)).toEqual([
      "Collected",
      "Report Uploaded",
      "Ready To Send",
    ]);
    expect(mapped[1]?.detail).toBe("Uploaded report.pdf");
    expect(mapped[1]?.color).toBe("blue");
    expect(mapped[2]?.color).toBe("purple");
  });

  it("shows re-upload detail and actor fallback", () => {
    const events: ReportTimelineEventApiItem[] = [
      {
        event_type: "artifact_reuploaded",
        timestamp: "2026-06-05T10:45:00Z",
        actor_name: "labmax1",
        message: "Previous file replaced",
      },
      {
        event_type: "artifact_reuploaded",
        timestamp: "2026-06-05T11:00:00Z",
        actor_name: "labmax1",
        message: "",
      },
    ];

    const mapped = buildReportTimelineEvents(events);
    expect(mapped[0]?.detail).toBe("Previous file replaced");
    expect(mapped[1]?.detail).toBe("Uploaded by labmax1");
  });
});
