"use client";

import {
  CollectionsPipelineBody,
  OperationalPipelineCard,
  ReportPipelineBody,
} from "@/components/labs/dashboard/OperationalPipelineCard";
import { PipelineEmptyState } from "@/components/labs/dashboard/PipelineEmptyState";
import { IncomingOrdersQueue } from "@/components/labs/dashboard/IncomingOrdersQueue";
import type { DashboardReportPipelineRow } from "@/lib/labs/dashboard/report-pipeline";
import type { LabCollectionRow, LabOrderRow } from "@/lib/labs/types";
import type { ReactNode } from "react";

type DashboardViewportGridProps = {
  pendingRows: LabOrderRow[];
  pendingTotal: number;
  acceptingId: string | null;
  onAccept: (order: LabOrderRow) => void;
  onView: (order: LabOrderRow) => void;
  collectionRows: LabCollectionRow[];
  collectionsTotal: number;
  reportsPendingRows: DashboardReportPipelineRow[];
  reportsPendingTotal: number;
  readyDeliveryRows: DashboardReportPipelineRow[];
  readyDeliveryTotal: number;
  footer: ReactNode;
};

export function DashboardViewportGrid({
  pendingRows,
  pendingTotal,
  acceptingId,
  onAccept,
  onView,
  collectionRows,
  collectionsTotal,
  reportsPendingRows,
  reportsPendingTotal,
  readyDeliveryRows,
  readyDeliveryTotal,
  footer,
}: DashboardViewportGridProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <IncomingOrdersQueue
        rows={pendingRows}
        total={pendingTotal}
        acceptingId={acceptingId}
        onAccept={onAccept}
        onView={onView}
      />

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <OperationalPipelineCard
          title="Collections today"
          viewAllHref="/lab-dashboard/home-collections/"
          total={collectionsTotal}
          isEmpty={collectionRows.length === 0}
          emptyMessage="No collections today."
        >
          <CollectionsPipelineBody rows={collectionRows} />
        </OperationalPipelineCard>

        <OperationalPipelineCard
          title="Reports pending upload"
          viewAllHref="/lab-dashboard/reports/?tab=pending"
          total={reportsPendingTotal}
          isEmpty={reportsPendingRows.length === 0}
          emptyMessage="No reports waiting for upload."
        >
          {reportsPendingRows.length === 0 ? (
            <PipelineEmptyState message="No reports waiting for upload." />
          ) : (
            <ReportPipelineBody
              rows={reportsPendingRows}
              actionLabel="Upload"
              actionHref="/lab-dashboard/reports/?tab=pending"
            />
          )}
        </OperationalPipelineCard>

        <OperationalPipelineCard
          title="Ready for delivery"
          viewAllHref="/lab-dashboard/reports/?tab=ready"
          total={readyDeliveryTotal}
          isEmpty={readyDeliveryRows.length === 0}
          emptyMessage="No reports ready to send."
        >
          {readyDeliveryRows.length === 0 ? (
            <PipelineEmptyState message="No reports ready to send." />
          ) : (
            <ReportPipelineBody
              rows={readyDeliveryRows}
              actionLabel="Deliver"
              actionHref="/lab-dashboard/reports/?tab=ready"
            />
          )}
        </OperationalPipelineCard>
      </div>

      {footer}
    </div>
  );
}
