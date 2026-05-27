"use client";

import { Button } from "@/components/ui/button";
import type { NextActionViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { cn } from "@/lib/utils";

export type ContextualActionButtonsProps = {
  nextAction: NextActionViewModel;
  onUpload: () => void;
  onSendAvailable: (reportIds?: string[]) => void;
  onRetry?: () => void;
  loading?: boolean;
  className?: string;
};

export function ContextualActionButtons({
  nextAction,
  onUpload,
  onSendAvailable,
  onRetry,
  loading,
  className,
}: ContextualActionButtonsProps) {
  const showRetry = Boolean(nextAction.retryReportId && onRetry);
  const sendReadyIds = nextAction.readyReportIds;
  const showSend = nextAction.showSendAvailable;
  const uploadText = `Upload ${nextAction.uploadLabel} Report`;

  if (!nextAction.showUpload && !showSend && !showRetry) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border border-[#D8D2FF] bg-[#F7F5FF] p-2", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B3FD9]">Next Action</p>
      <p className="mt-0.5 text-sm font-bold text-[#111827]">{nextAction.line}</p>
      <div className="mt-2 flex min-w-0 flex-wrap gap-1">
      {showRetry ? (
        <Button type="button" size="sm" variant="destructive" className="h-8 px-2.5 text-xs shadow-none" onClick={onRetry} disabled={loading}>
          Retry Delivery
        </Button>
      ) : null}
      {nextAction.showUpload && nextAction.uploadLabel ? (
        <Button type="button" size="sm" className="h-8 px-2.5 text-xs shadow-none bg-[#7C5CFC] hover:bg-[#6B4CE0]" onClick={onUpload} disabled={loading}>
          {uploadText}
        </Button>
      ) : null}
      {showSend ? (
        <Button
          type="button"
          size="sm"
          variant={nextAction.sendLabel ? "default" : "outline"}
          className={cn(
            "h-8 px-2.5 text-xs shadow-none",
            nextAction.sendLabel && "bg-[#7C5CFC] hover:bg-[#6B4CE0]",
          )}
          onClick={() => onSendAvailable(sendReadyIds.length === 1 ? sendReadyIds : undefined)}
          disabled={loading}
        >
          {nextAction.sendLabel ? `Send ${nextAction.sendLabel}` : "Send Available"}
        </Button>
      ) : null}
      </div>
    </div>
  );
}
