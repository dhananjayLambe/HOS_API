"use client";

import { OrderReportsChecklist } from "@/components/labs/reports/upload/shared/OrderReportsChecklist";
import { Button } from "@/components/ui/button";
import { operationalStatusLabel } from "@/lib/labs/reports/report-operational-status";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { UploadTaskContext } from "@/lib/labs/reports/upload/upload-task-context-adapter";
import { CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";

type UploadSuccessStepProps = {
  task: UploadTaskContext;
  status: ReportOperationalStatus;
  returnHref: string;
  onSendWhatsApp: () => void;
  onUploadAnother: () => void;
  onContinueNextReport?: () => void;
  onBackToQueue?: () => void;
  sending?: boolean;
};

export function UploadSuccessStep({
  task,
  status,
  returnHref,
  onSendWhatsApp,
  onUploadAnother,
  onContinueNextReport,
  onBackToQueue,
  sending,
}: UploadSuccessStepProps) {
  const patientQuery = encodeURIComponent(task.patientName);
  const nextPendingLabel = task.uploadProgress.pendingUploadLabels[0];
  const hasMoreUploads = task.uploadProgress.pendingUploadCount > 0;

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-6 text-center shadow-sm">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
      <h2 className="mt-2 text-lg font-semibold text-[#111827]">
        {hasMoreUploads
          ? `${task.uploadTestLabel} uploaded — more reports pending on this order.`
          : task.uploadProgress.isOrderReadyForDelivery
            ? "All reports on this order are uploaded and ready for review."
            : "Report uploaded successfully and ready for review."}
      </h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Status: <span className="font-medium text-[#111827]">{operationalStatusLabel(status)}</span>
      </p>
      {task.reportLines.length > 0 ? (
        <div className="mt-4 text-left">
          <OrderReportsChecklist lines={task.reportLines} progress={task.uploadProgress} />
        </div>
      ) : null}
      <p className="mt-3 text-xs text-[#6B7280]">
        Delivery is optional — send a WhatsApp notification when ready.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {hasMoreUploads && onContinueNextReport ? (
          <Button type="button" size="sm" className="h-9" onClick={onContinueNextReport}>
            Upload next report{nextPendingLabel ? ` (${nextPendingLabel})` : ""}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          onClick={onSendWhatsApp}
          disabled={sending}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Send WhatsApp Notification
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={onUploadAnother}>
          Upload Another
        </Button>
        {onBackToQueue ? (
          <Button type="button" variant="secondary" size="sm" className="h-9" onClick={onBackToQueue}>
            Back to reports queue
          </Button>
        ) : (
          <Button type="button" variant="secondary" size="sm" className="h-9" asChild>
            <Link href={returnHref}>Back to reports queue</Link>
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-9" asChild>
          <Link href={`/lab-dashboard/reports/?q=${patientQuery}`}>View patient reports</Link>
        </Button>
      </div>
    </div>
  );
}
