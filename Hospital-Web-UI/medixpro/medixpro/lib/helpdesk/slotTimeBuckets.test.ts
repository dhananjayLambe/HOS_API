import { describe, expect, it } from "vitest";

import type { Slot } from "./helpdeskAppointmentTypes";
import { getDefaultBucketForDate } from "./slotTimeBuckets";

function slot(startTime: string): Slot {
  return {
    id: startTime,
    startTime,
    endTime: "23:59",
    state: "available",
  };
}

describe("getDefaultBucketForDate", () => {
  it("today at 4:30pm selects evening when afternoon has no slots", () => {
    const todayIso = "2026-05-03";
    const now = new Date(2026, 4, 3, 16, 30, 0);
    const slots: Slot[] = [slot("17:00"), slot("18:00")];
    expect(getDefaultBucketForDate(todayIso, slots, now)).toBe("evening");
  });

  it("today at 10am stays morning when morning has slots", () => {
    const todayIso = "2026-05-03";
    const now = new Date(2026, 4, 3, 10, 0, 0);
    const slots: Slot[] = [slot("09:00"), slot("14:00")];
    expect(getDefaultBucketForDate(todayIso, slots, now)).toBe("morning");
  });

  it("today at 10am advances to afternoon when morning is empty", () => {
    const todayIso = "2026-05-03";
    const now = new Date(2026, 4, 3, 10, 0, 0);
    const slots: Slot[] = [slot("14:00")];
    expect(getDefaultBucketForDate(todayIso, slots, now)).toBe("afternoon");
  });

  it("future date picks first bucket that has slots", () => {
    const futureIso = "2026-06-01";
    const slots: Slot[] = [slot("18:00")];
    expect(getDefaultBucketForDate(futureIso, slots, new Date())).toBe("evening");
  });
});
