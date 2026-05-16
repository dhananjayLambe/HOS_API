"use client";

import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { reportWorkflowLabel, sampleWorkflowLabel } from "@/lib/labs/orders/workflow-labels";
import type { LabOrderRow } from "@/lib/labs/types";

function WorkflowRow({
  label,
  status,
  domain,
}: {
  label: string;
  status: string;
  domain: "order" | "sample" | "report";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/60 px-3 py-2">
      <span className="text-xs font-medium text-[#6B7280]">{label}</span>
      {domain === "order" ? (
        <LabStatusBadge domain="order" status={status} />
      ) : (
        <span className="text-xs font-semibold text-[#111827]">{status}</span>
      )}
    </div>
  );
}

export function OrderDetailWorkflowSection({ order }: { order: LabOrderRow }) {
  const sampleLabel = sampleWorkflowLabel(order.sampleStatus);
  const reportLabel = reportWorkflowLabel(order.reportStatus);

  return (
    <section>
      <h3 className={sectionTitle}>Workflow status</h3>
      <div className="space-y-2">
        <WorkflowRow label="Assignment" status={order.status} domain="order" />
        <WorkflowRow label="Sample" status={sampleLabel} domain="sample" />
        <WorkflowRow label="Report" status={reportLabel} domain="report" />
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">
        Next step:{" "}
        <span className="font-medium text-[#374151]">
          {order.status === "PENDING"
            ? "Review and accept or reject this assignment"
            : order.status === "ACCEPTED"
              ? "Start sample processing"
              : order.status === "IN_PROGRESS"
                ? "Complete sample handling and report upload"
                : order.status === "COMPLETED"
                  ? "Order completed"
                  : order.status === "REJECTED"
                    ? "No further action"
                    : "—"}
        </span>
      </p>
    </section>
  );
}
