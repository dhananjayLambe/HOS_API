"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DeliveryFailure } from "@/lib/labs/reports/completion/order-lifecycle.types";

export function DeliveryFailureDialog({
  open,
  failure,
  retrying,
  onOpenChange,
  onRetry,
}: {
  open: boolean;
  failure: DeliveryFailure;
  retrying?: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Delivery Failed</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-[#374151]">
          <section className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-900">
            <p className="font-semibold">WhatsApp delivery failed</p>
            <p className="text-xs text-[#374151]">
              {failure.reason}
            </p>
            <p className="mt-1 text-xs">
              If needed, contact the patient outside DoctorPro and use the uploaded report file as the source.
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled>
            Download PDF
          </Button>
          <Button type="button" variant="destructive" onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying..." : "Retry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
