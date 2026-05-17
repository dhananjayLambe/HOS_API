import type { LabCollectionRow } from "@/lib/labs/types";

/** Legacy mock — Home Collections page uses live API. Kept for dashboard home snippet only. */
export const MOCK_LAB_COLLECTIONS: Pick<
  LabCollectionRow,
  "id" | "patientName" | "status" | "assigneeName" | "slotDateLabel" | "slotTimeLabel"
>[] = [
  {
    id: "COL-201",
    patientName: "Anita Deshmukh",
    slotDateLabel: "Today",
    slotTimeLabel: "4–6 PM",
    assigneeName: "R. Kulkarni",
    status: "ASSIGNED",
  },
  {
    id: "COL-198",
    patientName: "Vikram Joshi",
    slotDateLabel: "Today",
    slotTimeLabel: "2–4 PM",
    assigneeName: "A. Shaikh",
    status: "IN_PROGRESS",
  },
];
