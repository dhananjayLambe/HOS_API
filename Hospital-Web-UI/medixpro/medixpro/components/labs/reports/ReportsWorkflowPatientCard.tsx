"use client";

import { ReportsWorkflowGroup, type ReportsWorkflowGroupProps } from "@/components/labs/reports/ReportsWorkflowGroup";

/** @deprecated Prefer ReportsWorkflowGroup — thin alias for existing imports. */
export function ReportsWorkflowPatientCard(props: ReportsWorkflowGroupProps) {
  return <ReportsWorkflowGroup {...props} />;
}
