import { resolveAllowedActions } from "@/lib/labs/orders/order-workflow-config";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { LabOrderRow } from "@/lib/labs/types";

/** Instant drawer shell before assignment detail API resolves. */
export function labOrderRowPreviewFromTask(task: ReportTask, branchLabel: string): LabOrderRow {
  return {
    id: task.orderNumber,
    assignmentId: task.assignmentId,
    orderUuid: task.orderUuid,
    patient: task.patientName,
    patientPhone: task.patientPhone,
    patientAge: 0,
    patientGender: "—",
    patientAddress: "",
    doctor: "—",
    clinic: "",
    tests: task.testNames.map((name) => ({
      name,
      category: "",
      urgency: task.urgency,
      homeEligible: task.collectionType === "HOME",
    })),
    collectionType: task.collectionType,
    preferredSlot: task.visitOrSlotLabel,
    branch: branchLabel,
    status: "ACCEPTED",
    sampleStatus: null,
    reportStatus: null,
    homeCollection: task.collectionType === "HOME",
    allowedActions: [],
    createdAt: task.updatedAtLabel,
    assignedAtIso: task.assignedAtIso,
    timeline: [],
  };
}
