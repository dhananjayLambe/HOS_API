import type { LabPatientRow } from "@/lib/labs/types";
import type { LabSampleRow } from "@/lib/labs/types";
import type { LabServiceRow } from "@/lib/labs/types";

export const MOCK_LAB_PATIENTS: LabPatientRow[] = [
  {
    id: "p1",
    name: "Anita Deshmukh",
    lastTest: "HbA1c",
    orders: 3,
    pendingReports: 1,
    phone: "+91 98765 43210",
  },
  {
    id: "p2",
    name: "Rahul K",
    lastTest: "MRI",
    orders: 1,
    pendingReports: 1,
    phone: "+91 91234 56789",
  },
];

export const MOCK_LAB_SAMPLES: LabSampleRow[] = [
  {
    barcode: "BC882910",
    patient: "Anita Deshmukh",
    test: "CBC",
    collectedAt: "2026-05-10 11:00",
    receivedAt: "2026-05-10 12:10",
    processingAt: "2026-05-10 12:30",
    status: "PROCESSING",
  },
  {
    barcode: "BC882905",
    patient: "Priya N",
    test: "TSH",
    collectedAt: "2026-05-10 08:00",
    receivedAt: "2026-05-10 09:05",
    status: "RECEIVED",
  },
];

export const MOCK_LAB_SERVICES: LabServiceRow[] = [
  {
    id: "svc1",
    test: "CBC",
    price: 450,
    homeCollection: true,
    tatHours: 12,
    active: true,
  },
  {
    id: "svc2",
    test: "HbA1c",
    price: 600,
    homeCollection: true,
    tatHours: 24,
    active: true,
  },
  {
    id: "svc3",
    test: "MRI Lumbar",
    price: 8500,
    homeCollection: false,
    tatHours: 48,
    active: true,
  },
];
