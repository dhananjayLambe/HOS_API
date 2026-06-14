import { describe, expect, it } from "vitest";

import { mapDoctorReportsDashboard } from "@/lib/doctor/mapDoctorReportsDashboard";
import type { DoctorReportsDashboardData } from "@/lib/api/doctor-reports-dashboard";

function baseDashboardData(
  overrides: Partial<DoctorReportsDashboardData> = {},
): DoctorReportsDashboardData {
  return {
    insights: {
      ready_for_review: 1,
      reviewed_today: 2,
      pending_upload: 3,
      reports_received_today: 4,
    },
    reports: {
      count: 1,
      results: [
        {
          report_id: "report-1",
          patient_id: "patient-1",
          patient_name: "Amit Patil",
          encounter_id: "enc-1",
          visit_date: "2026-06-13",
          report_type: "CBC",
          uploaded_at: new Date().toISOString(),
          review_status: "READY_FOR_REVIEW",
          priority: "HIGH",
          is_critical: true,
          doctor_acknowledged: true,
          whatsapp_sent: true,
        },
      ],
    },
    recent_activity: [
      {
        event_type: "REPORT_UPLOADED",
        patient_name: "Amit Patil",
        report_name: "CBC",
        timestamp: "2026-06-13T10:30:00Z",
      },
    ],
    ...overrides,
  };
}

describe("mapDoctorReportsDashboard", () => {
  it("maps review statuses and V2 fields", () => {
    const mapped = mapDoctorReportsDashboard(baseDashboardData());
    expect(mapped.reports[0].reviewStatus).toBe("Ready For Review");
    expect(mapped.reports[0].priority).toBe("HIGH");
    expect(mapped.reports[0].isCritical).toBe(true);
    expect(mapped.reports[0].doctorAcknowledged).toBe(true);
    expect(mapped.reports[0].whatsappSent).toBe(true);
    expect(mapped.insights.readyForReview).toBe(1);
    expect(mapped.totalCount).toBe(1);
  });

  it("formats uploaded_at as Today for same-day uploads", () => {
    const mapped = mapDoctorReportsDashboard(baseDashboardData());
    expect(mapped.reports[0].uploaded).toBe("Today");
  });

  it("uses synthetic id for pending upload rows without report_id", () => {
    const mapped = mapDoctorReportsDashboard(
      baseDashboardData({
        reports: {
          count: 1,
          results: [
            {
              report_id: null,
              patient_id: "patient-9",
              patient_name: "Pending Patient",
              encounter_id: "enc-9",
              visit_date: "2026-06-12",
              report_type: "Thyroid",
              uploaded_at: null,
              review_status: "PENDING_UPLOAD",
              priority: "NORMAL",
              is_critical: false,
              doctor_acknowledged: false,
              whatsapp_sent: false,
            },
          ],
        },
      }),
    );
    expect(mapped.reports[0].id).toBe("pending-patient-9-0");
    expect(mapped.reports[0].uploaded).toBe("—");
    expect(mapped.reports[0].reviewStatus).toBe("Pending Upload");
  });

  it("maps activity descriptions", () => {
    const mapped = mapDoctorReportsDashboard(baseDashboardData());
    expect(mapped.activity[0].description).toBe("CBC uploaded");
  });
});
