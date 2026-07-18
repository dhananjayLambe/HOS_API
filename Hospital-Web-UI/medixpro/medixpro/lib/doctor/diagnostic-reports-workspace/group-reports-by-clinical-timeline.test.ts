import { describe, expect, it } from "vitest";
import {
  clinicalTimelineBucketForDate,
  groupReportsByClinicalTimeline,
} from "./group-reports-by-clinical-timeline";

describe("groupReportsByClinicalTimeline", () => {
  const now = new Date("2026-07-18T12:00:00");

  it("buckets by relative calendar windows", () => {
    expect(clinicalTimelineBucketForDate("2026-07-18T08:00:00", now)).toBe(
      "today"
    );
    expect(clinicalTimelineBucketForDate("2026-07-15T08:00:00", now)).toBe(
      "this_week"
    );
    expect(clinicalTimelineBucketForDate("2026-07-01T08:00:00", now)).toBe(
      "last_month"
    );
    expect(clinicalTimelineBucketForDate("2026-05-01T08:00:00", now)).toBe(
      "older"
    );
  });

  it("groups and sorts newest first; omits empty buckets", () => {
    const groups = groupReportsByClinicalTimeline(
      [
        { id: "old", reportDate: "2026-01-01T00:00:00" },
        { id: "today-a", reportDate: "2026-07-18T10:00:00" },
        { id: "today-b", reportDate: "2026-07-18T08:00:00" },
        { id: "week", reportDate: "2026-07-14T00:00:00" },
      ],
      now
    );

    expect(groups.map((g) => g.id)).toEqual(["today", "this_week", "older"]);
    expect(groups[0].reports.map((r) => r.id)).toEqual(["today-a", "today-b"]);
    expect(groups[1].reports[0].id).toBe("week");
    expect(groups[2].reports[0].id).toBe("old");
  });

  it("falls back to uploadedAt then collectionDate", () => {
    const groups = groupReportsByClinicalTimeline(
      [
        {
          id: "u",
          reportDate: null,
          uploadedAt: "2026-07-18T09:00:00",
        },
        {
          id: "c",
          reportDate: null,
          uploadedAt: null,
          collectionDate: "2026-07-14T00:00:00",
        },
      ],
      now
    );
    expect(groups[0].id).toBe("today");
    expect(groups[0].reports[0].id).toBe("u");
    expect(groups[1].id).toBe("this_week");
  });
});