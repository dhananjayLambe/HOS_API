/**
 * Operational demo queue when labs/orders/ returns no report tasks, or when forced via ?demo=1.
 * Remove automatic fallback when branch consistently has API data.
 */
import { buildReportTasksFromOrders, type ReportTask } from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function demoOrder(partial: {
  assignmentId: string;
  orderNumber: string;
  patient: string;
  phone: string;
  tests: string[];
  collectionType: "HOME" | "VISIT";
  reportStatus: string;
  slot?: string;
  assignedAtIso?: string;
  urgency?: "ROUTINE" | "URGENT";
}): LabOrderRow {
  return {
    id: partial.orderNumber,
    assignmentId: partial.assignmentId,
    orderUuid: `demo-uuid-${partial.assignmentId}`,
    patient: partial.patient,
    patientPhone: partial.phone,
    patientAge: 32,
    patientGender: "—",
    patientAddress: "",
    doctor: "Dr. Demo",
    clinic: "Main lab",
    tests: partial.tests.map((name) => ({
      name,
      category: "",
      urgency: partial.urgency ?? "ROUTINE",
      homeEligible: partial.collectionType === "HOME",
    })),
    collectionType: partial.collectionType,
    preferredSlot: partial.slot ?? "Today 10:00",
    branch: "",
    status: "IN_PROGRESS",
    sampleStatus: "COMPLETED",
    reportStatus: partial.reportStatus,
    homeCollection: partial.collectionType === "HOME",
    allowedActions: ["upload_report"],
    createdAt: "",
    assignedAtIso: partial.assignedAtIso ?? hoursAgo(2),
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    urgency: partial.urgency ?? "ROUTINE",
    timeline: [],
  };
}

/** Rich fixture set — every operational status, multi-task patients, search-friendly fields. */
const DEMO_ORDERS: LabOrderRow[] = [
  // Rahul K — mixed progress (pending + uploaded + pending)
  demoOrder({
    assignmentId: "demo-rahul-1",
    orderNumber: "ORD-D1023",
    patient: "Rahul K",
    phone: "9876500001",
    tests: ["CBC", "Thyroid Profile"],
    collectionType: "HOME",
    reportStatus: "pending",
    assignedAtIso: hoursAgo(2),
  }),
  demoOrder({
    assignmentId: "demo-rahul-2",
    orderNumber: "ORD-D1024",
    patient: "Rahul K",
    phone: "9876500001",
    tests: ["Vitamin D"],
    collectionType: "VISIT",
    reportStatus: "in_progress",
    assignedAtIso: hoursAgo(20),
  }),
  demoOrder({
    assignmentId: "demo-rahul-3",
    orderNumber: "ORD-D1028",
    patient: "Rahul K",
    phone: "9876500001",
    tests: ["HbA1c"],
    collectionType: "HOME",
    reportStatus: "pending",
    assignedAtIso: hoursAgo(1),
    urgency: "URGENT",
  }),
  // Priya S — ready + pending
  demoOrder({
    assignmentId: "demo-priya-1",
    orderNumber: "ORD-D1025",
    patient: "Priya S",
    phone: "9876500002",
    tests: ["MRI Brain"],
    collectionType: "VISIT",
    reportStatus: "ready",
    assignedAtIso: hoursAgo(4),
  }),
  demoOrder({
    assignmentId: "demo-priya-2",
    orderNumber: "ORD-D1035",
    patient: "Priya S",
    phone: "9876500002",
    tests: ["CT Abdomen"],
    collectionType: "VISIT",
    reportStatus: "pending",
    assignedAtIso: hoursAgo(3),
  }),
  // Anita Sharma — delivered today
  demoOrder({
    assignmentId: "demo-anita-1",
    orderNumber: "ORD-D1026",
    patient: "Anita Sharma",
    phone: "9876500003",
    tests: ["Lipid Profile"],
    collectionType: "HOME",
    reportStatus: "delivered",
    assignedAtIso: hoursAgo(1),
  }),
  // Vikram Joshi — failed delivery
  demoOrder({
    assignmentId: "demo-vikram-1",
    orderNumber: "ORD-D1027",
    patient: "Vikram Joshi",
    phone: "9876500004",
    tests: ["CBC"],
    collectionType: "VISIT",
    reportStatus: "rejected",
    assignedAtIso: hoursAgo(6),
  }),
  // Meera N — two pending (HOME)
  demoOrder({
    assignmentId: "demo-meera-1",
    orderNumber: "ORD-D1029",
    patient: "Meera N",
    phone: "9876500005",
    tests: ["LFT", "KFT"],
    collectionType: "HOME",
    reportStatus: "pending",
    slot: "Today 14:00",
    assignedAtIso: hoursAgo(5),
  }),
  demoOrder({
    assignmentId: "demo-meera-2",
    orderNumber: "ORD-D1030",
    patient: "Meera N",
    phone: "9876500005",
    tests: ["Urine Routine"],
    collectionType: "HOME",
    reportStatus: "pending",
    assignedAtIso: hoursAgo(4),
  }),
  // Arjun Patel — uploaded only
  demoOrder({
    assignmentId: "demo-arjun-1",
    orderNumber: "ORD-D1031",
    patient: "Arjun Patel",
    phone: "9876500006",
    tests: ["PSA", "Free PSA"],
    collectionType: "VISIT",
    reportStatus: "in_progress",
    assignedAtIso: hoursAgo(8),
  }),
  // Sunita R — ready delivery
  demoOrder({
    assignmentId: "demo-sunita-1",
    orderNumber: "ORD-D1032",
    patient: "Sunita R",
    phone: "9876500007",
    tests: ["Pap Smear"],
    collectionType: "VISIT",
    reportStatus: "ready",
    assignedAtIso: hoursAgo(3),
  }),
  // Kavita M — failed + pending (severity: pending wins)
  demoOrder({
    assignmentId: "demo-kavita-1",
    orderNumber: "ORD-D1033",
    patient: "Kavita M",
    phone: "9876500008",
    tests: ["X-Ray Chest"],
    collectionType: "VISIT",
    reportStatus: "rejected",
    assignedAtIso: hoursAgo(12),
  }),
  demoOrder({
    assignmentId: "demo-kavita-2",
    orderNumber: "ORD-D1034",
    patient: "Kavita M",
    phone: "9876500008",
    tests: ["ECG"],
    collectionType: "VISIT",
    reportStatus: "pending",
    assignedAtIso: hoursAgo(2),
  }),
  // Omar H — delivered (older — not counted in delivered-today KPI)
  demoOrder({
    assignmentId: "demo-omar-1",
    orderNumber: "ORD-D1036",
    patient: "Omar H",
    phone: "9876500009",
    tests: ["Blood Sugar Fasting"],
    collectionType: "HOME",
    reportStatus: "delivered",
    assignedAtIso: hoursAgo(30),
  }),
];

let cachedDemoTasks: ReportTask[] | null = null;

export function getDemoReportTasks(): ReportTask[] {
  if (!cachedDemoTasks) {
    cachedDemoTasks = buildReportTasksFromOrders(DEMO_ORDERS);
  }
  return cachedDemoTasks;
}

/** Reset cache in tests after mutating demo orders. */
export function resetDemoReportTasksCache(): void {
  cachedDemoTasks = null;
}

export function isDemoTaskId(taskId: string): boolean {
  return taskId.startsWith("demo-");
}

/** Force demo data via URL (?demo=1) or NEXT_PUBLIC_LAB_REPORTS_DEMO=true */
export function isReportsDemoForced(
  searchParams: Pick<URLSearchParams, "get"> | null | undefined,
): boolean {
  if (process.env.NEXT_PUBLIC_LAB_REPORTS_DEMO === "true") return true;
  const flag = searchParams?.get("demo");
  return flag === "1" || flag === "true";
}

export function shouldUseReportsDemoData(options: {
  apiTaskCount: number;
  loading: boolean;
  error: string | null;
  forceDemo: boolean;
}): boolean {
  if (options.loading || options.error) return false;
  return options.forceDemo || options.apiTaskCount === 0;
}
