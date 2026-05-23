"use client";

import { OrderDetailCollectionSection } from "@/components/labs/orders/detail/OrderDetailCollectionSection";
import { OrderDetailDoctorSection } from "@/components/labs/orders/detail/OrderDetailDoctorSection";
import { OrderDetailHeader } from "@/components/labs/orders/detail/OrderDetailHeader";
import { OrderDetailInvestigationsSection } from "@/components/labs/orders/detail/OrderDetailInvestigationsSection";
import { OrderDetailPatientSection } from "@/components/labs/orders/detail/OrderDetailPatientSection";
import { OrderDetailTimelineSection } from "@/components/labs/orders/detail/OrderDetailTimelineSection";
import { OrderDetailWorkflowFooter } from "@/components/labs/orders/detail/OrderDetailWorkflowFooter";
import { OrderDetailWorkflowSection } from "@/components/labs/orders/detail/OrderDetailWorkflowSection";
import { ReportDrawerSections } from "@/components/labs/reports/detail/ReportDrawerSections";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useLabOrderDetail } from "@/hooks/labs/useLabOrderDetail";
import type { ReportOrderDrawerPanel } from "@/hooks/labs/useReportOrderDrawer";
import type { LabOrderRow } from "@/lib/labs/types";

export type ReportDrawerActions = {
  onMarkReady?: (reportId: string) => void;
  onRetryDelivery?: (logId: string, reportId?: string) => void;
  onUpload?: (taskId: string) => void;
  actionLoading?: string | null;
};

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onOrderPatched,
  onQueueRefresh,
  reportPanel,
  onRefreshLineage,
  refreshingLineage,
  reportActions,
}: {
  order: LabOrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderPatched?: (row: LabOrderRow) => void;
  onQueueRefresh?: () => void;
  reportPanel?: ReportOrderDrawerPanel | null;
  onRefreshLineage?: () => void;
  refreshingLineage?: boolean;
  reportActions?: ReportDrawerActions;
}) {
  const {
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectReason,
    setRejectReason,
    actionLoading,
    runAction,
    confirmReject,
    isActionEnabled,
  } = useLabOrderDetail(order, { onOrderPatched, onQueueRefresh });

  if (!order) return null;

  const showReportPanel = !!reportPanel;
  const orderLoading = reportPanel?.loading.order ?? false;
  const hideTimeline = showReportPanel || order.timeline.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-[#ECEBFF] bg-white p-0 sm:max-w-lg md:max-w-xl"
      >
        <OrderDetailHeader order={order} />

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {orderLoading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading order details">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ) : (
              <>
                <OrderDetailPatientSection order={order} />
                <Separator className="bg-[#ECEBFF]" />
                <OrderDetailDoctorSection order={order} />
                <Separator className="bg-[#ECEBFF]" />
                <OrderDetailInvestigationsSection order={order} />
                <Separator className="bg-[#ECEBFF]" />
                <OrderDetailCollectionSection order={order} />
                <Separator className="bg-[#ECEBFF]" />
                <OrderDetailWorkflowSection order={order} />
              </>
            )}

            {showReportPanel && reportPanel ? (
              <>
                <Separator className="bg-[#ECEBFF]" />
                <ReportDrawerSections
                  panel={reportPanel}
                  onRefreshLineage={onRefreshLineage}
                  refreshingLineage={refreshingLineage}
                  reportActions={reportActions}
                />
              </>
            ) : null}

            {!hideTimeline ? (
              <>
                <Separator className="bg-[#ECEBFF]" />
                <OrderDetailTimelineSection events={order.timeline} />
              </>
            ) : null}
            {order.notes ? (
              <>
                <Separator className="bg-[#ECEBFF]" />
                <section>
                  <h3 className={sectionTitle}>Notes</h3>
                  <p className="rounded-xl border border-[color:rgba(124,92,252,0.2)] bg-[#F4F1FF]/80 p-3 text-sm leading-relaxed text-[#374151]">
                    {order.notes}
                  </p>
                </section>
              </>
            ) : null}
          </div>
        </ScrollArea>

        <OrderDetailWorkflowFooter
          order={order}
          actionLoading={actionLoading}
          isActionEnabled={isActionEnabled}
          onAction={runAction}
          rejectDialogOpen={rejectDialogOpen}
          onRejectDialogOpenChange={setRejectDialogOpen}
          rejectReason={rejectReason}
          onRejectReasonChange={setRejectReason}
          onConfirmReject={confirmReject}
        />
      </SheetContent>
    </Sheet>
  );
}
