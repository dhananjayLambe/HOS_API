import { describe, expect, it } from "vitest";
import { mapReportHistoryDto } from "@/lib/labs/reports/api/v1/reports-api-mappers";
import type { ReportHistoryApiData } from "@/lib/labs/reports/api/report-api-types";

describe("mapReportHistoryDto", () => {
  it("maps lineage, artifacts, and delivery logs", () => {
    const dto: ReportHistoryApiData = {
      report_id: 42,
      supersedes_id: 40,
      superseded_by_id: 44,
      artifacts: [
        {
          id: 1,
          artifact_type: "PDF",
          original_filename: "result.pdf",
          download_filename: "result.pdf",
          file_size: 1000,
          content_type: "application/pdf",
          is_primary: true,
          version: 1,
          uploaded_at: "2026-05-01T10:00:00Z",
          download_url: "/files/1",
        },
      ],
      delivery_logs: [
        {
          id: 9,
          status: "SENT",
          sent_at: "2026-05-01T11:00:00Z",
          delivered_at: null,
          failure_reason: null,
          retry_count: 0,
        },
      ],
    };

    const mapped = mapReportHistoryDto(dto);
    expect(mapped.reportId).toBe("42");
    expect(mapped.supersedesId).toBe("40");
    expect(mapped.supersededById).toBe("44");
    expect(mapped.artifacts).toHaveLength(1);
    expect(mapped.artifacts[0].originalFilename).toBe("result.pdf");
    expect(mapped.deliveryLogs[0].status).toBe("SENT");
  });
});
