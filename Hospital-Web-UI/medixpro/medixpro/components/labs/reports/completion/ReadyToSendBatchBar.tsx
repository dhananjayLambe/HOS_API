"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

export type ReadyToSendBatchBarProps = {
  readyCount: number;
  patientCount: number;
  failedCount: number;
  onSendAll: () => void;
  loading?: boolean;
};

export function ReadyToSendBatchBar({
  readyCount,
  patientCount,
  failedCount,
  onSendAll,
  loading,
}: ReadyToSendBatchBarProps) {
  const [reviewOpen, setReviewOpen] = useState(false);
  if (readyCount < 3) return null;

  return (
    <>
      <div className="fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#7C5CFC]/25 bg-white px-3 py-1.5 shadow-md">
        <span className="text-xs font-medium text-[#111827]">
          {readyCount} reports ready across {patientCount} patient{patientCount === 1 ? "" : "s"}
        </span>
        {failedCount > 0 ? (
          <>
            <span className="text-xs text-[#9CA3AF]" aria-hidden>·</span>
            <span className="text-xs font-semibold text-red-700">{failedCount} failed</span>
          </>
        ) : null}
        <span className="text-xs text-[#9CA3AF]" aria-hidden>·</span>
        <Button
          type="button"
          size="sm"
          className="h-7 px-2.5 text-xs shadow-none bg-[#7C5CFC] hover:bg-[#6B4CE0]"
          onClick={() => setReviewOpen(true)}
          disabled={loading}
        >
          Review & Send
        </Button>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Ready Reports</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm text-[#374151]">
            <p>
              {readyCount} ready reports will be sent across {patientCount} patient{patientCount === 1 ? "" : "s"}.
            </p>
            {failedCount > 0 ? (
              <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                {failedCount} failed report{failedCount === 1 ? "" : "s"} need attention and will not be sent by this batch action.
              </p>
            ) : null}
            <p className="text-xs text-[#6B7280]">Only reports currently marked Ready are included.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setReviewOpen(false);
                onSendAll();
              }}
              disabled={loading}
            >
              Send Ready Reports
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
