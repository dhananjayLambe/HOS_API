import { describe, expect, it } from "vitest";
import { buildCollectionTimeline } from "@/lib/labs/home-collections/build-collection-timeline";
import type { LabCollectionRow } from "@/lib/labs/types";

function baseRow(overrides: Partial<LabCollectionRow> = {}): LabCollectionRow {
  return {
    id: "c1",
    orderNumber: "DX001",
    orderUuid: "o1",
    assignmentId: "a1",
    patientName: "Test",
    patientPhone: "+91",
    patientAge: 30,
    patientGender: "M",
    testCount: 1,
    testNames: ["CBC"],
    testNamesOverflow: 0,
    slotDateLabel: "Today",
    slotTimeLabel: "9–11",
    preferredDate: "2026-05-17",
    preferredSlot: "9–11",
    confirmedDate: null,
    confirmedSlot: null,
    assigneeName: null,
    assigneeId: null,
    assignmentNote: "",
    status: "PENDING",
    workflowHint: "Assign",
    allowedActions: ["assign"],
    addressFormatted: "Addr",
    addressSnapshot: {},
    patientNotes: null,
    internalNotes: null,
    assignedAt: null,
    inProgressAt: null,
    collectedAt: null,
    failedAt: null,
    retryCount: 0,
    collectionType: "HOME",
    ...overrides,
  };
}

describe("buildCollectionTimeline", () => {
  it("returns events newest-first from workflow timestamps", () => {
    const events = buildCollectionTimeline(
      baseRow({
        assignedAt: "2026-05-17T08:00:00Z",
        inProgressAt: "2026-05-17T09:00:00Z",
        collectedAt: "2026-05-17T10:00:00Z",
        assignmentNote: "North route",
        assigneeName: "R. Kulkarni",
      }),
    );
    expect(events).toHaveLength(3);
    expect(events[0]?.label).toBe("Sample collected");
    expect(events[1]?.label).toBe("Collection started");
    expect(events[2]?.label).toBe("Collection assigned");
    expect(events[2]?.detail).toBe("North route");
    expect(events[2]?.actor).toBe("Phlebotomist · R. Kulkarni");
  });

  it("returns empty when no timestamps", () => {
    expect(buildCollectionTimeline(baseRow())).toEqual([]);
  });
});
