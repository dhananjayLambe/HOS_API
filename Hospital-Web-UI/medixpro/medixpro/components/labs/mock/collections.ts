import type { LabCollectionRow } from "@/lib/labs/types";

export const MOCK_LAB_COLLECTIONS: LabCollectionRow[] = [
  {
    id: "COL-201",
    patient: "Anita Deshmukh",
    address: "Baner — Sunrise Apts 3B",
    slot: "Today 4–6 PM",
    assignee: "R. Kulkarni",
    status: "ASSIGNED",
    phone: "+91 98765 43210",
  },
  {
    id: "COL-198",
    patient: "Vikram Joshi",
    address: "Hinjewadi Phase 2",
    slot: "Today 2–4 PM",
    assignee: "A. Shaikh",
    status: "COLLECTION_STARTED",
    phone: "+91 90111 22333",
  },
];
