import type { LabReportQueueRow } from "@/lib/labs/types";
import type { LabDeliveryRow } from "@/lib/labs/types";

export const MOCK_LAB_REPORT_QUEUE: LabReportQueueRow[] = [
  {
    id: "RPT-501",
    patient: "Rahul K",
    tests: "MRI Lumbar",
    status: "PENDING_UPLOAD",
    collectedAt: "—",
  },
  {
    id: "RPT-498",
    patient: "Priya N",
    tests: "Thyroid panel",
    status: "UNDER_REVIEW",
    uploadedBy: "tech@lab",
    reviewedBy: undefined,
    collectedAt: "2026-05-10 08:00",
  },
  {
    id: "RPT-490",
    patient: "Sunita Patil",
    tests: "Lipid Panel",
    status: "APPROVED",
    uploadedBy: "tech@lab",
    reviewedBy: "Dr. Admin",
    collectedAt: "2026-05-09 11:00",
  },
];

export const MOCK_LAB_DELIVERIES: LabDeliveryRow[] = [
  {
    id: "DLV-900",
    patient: "Sunita Patil",
    report: "Lipid Panel",
    channel: "WHATSAPP",
    status: "VIEWED",
    sentAt: "2026-05-09 14:02",
    viewedAt: "2026-05-09 18:21",
  },
  {
    id: "DLV-897",
    patient: "Unknown",
    report: "CBC",
    channel: "WHATSAPP",
    status: "FAILED",
    sentAt: "2026-05-09 09:00",
  },
];
