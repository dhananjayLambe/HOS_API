import type { CollectionStatus } from "@/lib/labs/constants/status";
import type { HomeCollectionActionKey } from "@/lib/labs/api/home-collections-types";
import type { OrderStatus } from "@/lib/labs/constants/status";
import type { ReportStatus } from "@/lib/labs/constants/status";
import type { DeliveryStatus } from "@/lib/labs/constants/status";
import type { AppointmentStatus } from "@/lib/labs/constants/status";
import type { SampleStatus } from "@/lib/labs/constants/status";
import type { UrgencyLevel } from "@/lib/labs/constants/urgency";
import type { LabOrderActionKey } from "@/lib/labs/orders/order-workflow-config";

export type LabTimelineEvent = {
  at: string;
  label: string;
  detail?: string;
  /** Optional actor or system line shown under the event label. */
  actor?: string;
};

export type LabOrderTest = {
  name: string;
  category: string;
  urgency: UrgencyLevel;
  homeEligible: boolean;
};

export type LabOrderRow = {
  /** Display order number (e.g. DX260516…). */
  id: string;
  assignmentId: string;
  orderUuid: string;
  patient: string;
  patientPhone: string;
  patientAge: number;
  patientGender: string;
  patientAddress: string;
  doctor: string;
  clinic: string;
  prescriptionUrl?: string;
  tests: LabOrderTest[];
  collectionType: "HOME" | "VISIT";
  preferredSlot: string;
  branch: string;
  status: OrderStatus;
  sampleStatus: string | null;
  reportStatus: string | null;
  homeCollection: boolean;
  allowedActions: LabOrderActionKey[];
  createdAt: string;
  urgency: UrgencyLevel;
  timeline: LabTimelineEvent[];
  notes?: string;
  /** ISO timestamp for SLA countdown (from list API assigned_at). */
  assignedAtIso?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
};

export type LabCollectionRow = {
  id: string;
  orderNumber: string;
  orderUuid: string;
  assignmentId: string | null;
  patientName: string;
  patientPhone: string;
  patientAge: number | null;
  patientGender: string;
  testCount: number;
  testNames: string[];
  testNamesOverflow: number;
  slotDateLabel: string;
  slotTimeLabel: string;
  preferredDate: string;
  preferredSlot: string;
  confirmedDate: string | null;
  confirmedSlot: string | null;
  assigneeName: string | null;
  assigneeId: string | null;
  assignmentNote: string;
  status: CollectionStatus;
  workflowHint: string;
  allowedActions: HomeCollectionActionKey[];
  addressFormatted: string;
  addressSnapshot: Record<string, unknown>;
  patientNotes: string | null;
  internalNotes: string | null;
  assignedAt: string | null;
  inProgressAt: string | null;
  collectedAt: string | null;
  failedAt: string | null;
  retryCount: number;
  collectionType: string;
};

export type LabAppointmentRow = {
  id: string;
  patient: string;
  tests: string;
  date: string;
  slot: string;
  status: AppointmentStatus;
  instructions: string;
  fastingRequired: boolean;
  radiologist?: string;
};

export type LabSampleRow = {
  barcode: string;
  patient: string;
  test: string;
  collectedAt: string;
  receivedAt?: string;
  processingAt?: string;
  status: SampleStatus;
};

export type LabReportQueueRow = {
  id: string;
  patient: string;
  tests: string;
  status: ReportStatus;
  uploadedBy?: string;
  reviewedBy?: string;
  collectedAt?: string;
};

export type LabDeliveryRow = {
  id: string;
  patient: string;
  report: string;
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  status: DeliveryStatus;
  sentAt?: string;
  viewedAt?: string;
};

export type LabPatientRow = {
  id: string;
  name: string;
  lastTest: string;
  orders: number;
  pendingReports: number;
  phone: string;
};

export type LabServiceRow = {
  id: string;
  test: string;
  price: number;
  homeCollection: boolean;
  tatHours: number;
  active: boolean;
};
