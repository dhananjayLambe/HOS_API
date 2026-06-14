import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctorReportsTable, type DoctorReportRow } from "@/components/doctor/doctor-reports-table";

function readyRow(overrides: Partial<DoctorReportRow> = {}): DoctorReportRow {
  return {
    id: "row-1",
    reportId: "report-1",
    patientId: "patient-1",
    patientName: "Amit Patil",
    reportType: "CBC",
    uploaded: "Today",
    reviewStatus: "Ready For Review",
    priority: "CRITICAL",
    isCritical: true,
    ...overrides,
  };
}

describe("DoctorReportsTable", () => {
  it("renders report work queue title", () => {
    render(
      createElement(DoctorReportsTable, {
        reports: [readyRow()],
      }),
    );
    expect(screen.getByText("Report Work Queue")).toBeInTheDocument();
  });

  it("renders priority badge for critical rows", () => {
    render(
      createElement(DoctorReportsTable, {
        reports: [readyRow()],
      }),
    );
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("does not make pending upload rows clickable for open report", () => {
    const { container } = render(
      createElement(DoctorReportsTable, {
        reports: [
          readyRow({
            id: "pending-1",
            reportId: undefined,
            reviewStatus: "Pending Upload",
            priority: "NORMAL",
            isCritical: false,
          }),
        ],
        onOpenReport: vi.fn(),
      }),
    );

    const row = container.querySelector("tbody tr");
    expect(row?.className).not.toContain("cursor-pointer");
  });
});
