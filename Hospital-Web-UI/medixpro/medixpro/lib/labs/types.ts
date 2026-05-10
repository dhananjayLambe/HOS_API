import type { CollectionStatus } from "@/lib/labs/constants/status";
import type { OrderStatus } from "@/lib/labs/constants/status";
import type { ReportStatus } from "@/lib/labs/constants/status";
import type { DeliveryStatus } from "@/lib/labs/constants/status";
import type { AppointmentStatus } from "@/lib/labs/constants/status";
import type { SampleStatus } from "@/lib/labs/constants/status";
import type { UrgencyLevel } from "@/lib/labs/constants/urgency";

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
  id: string;
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
  createdAt: string;
  urgency: UrgencyLevel;
  timeline: LabTimelineEvent[];
  notes?: string;
};

export type LabCollectionRow = {
  id: string;
  patient: string;
  address: string;
  slot: string;
  assignee: string | null;
  status: CollectionStatus;
  phone: string;
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
