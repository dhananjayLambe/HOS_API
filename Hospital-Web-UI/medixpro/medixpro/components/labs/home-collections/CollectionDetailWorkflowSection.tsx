"use client";

import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import type { LabCollectionRow } from "@/lib/labs/types";

export function CollectionDetailWorkflowSection({ row }: { row: LabCollectionRow }) {
  return (
    <section>
      <h3 className={sectionTitle}>Workflow status</h3>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/60 px-3 py-2">
        <span className="text-xs font-medium text-[#6B7280]">Collection</span>
        <LabStatusBadge domain="collection" status={row.status} />
      </div>
      <p className="mt-2 text-xs text-[#6B7280]">
        Next step: <span className="font-medium text-[#374151]">{row.workflowHint}</span>
      </p>
    </section>
  );
}
