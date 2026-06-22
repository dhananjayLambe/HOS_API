import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctorRecentTrends } from "@/components/doctor/doctor-recent-trends";

describe("DoctorRecentTrends", () => {
  it("renders trend rows with label, today, and week", () => {
    render(
      createElement(DoctorRecentTrends, {
        trends: [
          { metricKey: "consultations", label: "Consultations", today: 18, week: 68 },
          { metricKey: "new_patients", label: "New Patients", today: 5, week: 15 },
        ],
      }),
    );

    expect(screen.getByText("Recent Trends")).toBeInTheDocument();
    expect(screen.getByText("Consultations")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("68")).toBeInTheDocument();
    expect(screen.getByText("New Patients")).toBeInTheDocument();
  });
});
