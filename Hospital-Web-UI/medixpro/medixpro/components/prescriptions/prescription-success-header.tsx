"use client";

import { CheckCircle2, Printer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrescriptionSuccessHeaderProps {
  patientName: string;
  ageGender: string;
  pnr: string;
  completedTime: string;
  onPrint: () => void;
  onCancel: () => void;
  isCancelled: boolean;
  actionsDisabled?: boolean;
}

export function PrescriptionSuccessHeader({
  patientName,
  ageGender,
  pnr,
  completedTime,
  onPrint,
  onCancel,
  isCancelled,
  actionsDisabled = false,
}: PrescriptionSuccessHeaderProps) {
  return (
    <div className="sticky top-0 z-30 rounded-2xl border bg-white px-4 py-4 shadow-sm md:px-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-1 h-6 w-6 text-emerald-600" />
          <div>
            <h1 className="text-base font-semibold md:text-lg">Consultation Completed Successfully</h1>
            <p className="text-sm text-muted-foreground">Prescription has been generated and downloaded successfully.</p>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              {patientName} • {ageGender} • {pnr} • {completedTime}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onPrint}
            disabled={actionsDisabled || isCancelled}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button type="button" variant="destructive" className="min-h-11" onClick={onCancel} disabled={actionsDisabled}>
            <XCircle className="mr-2 h-4 w-4" />
            {isCancelled ? "Cancelled" : "Cancel Prescription"}
          </Button>
        </div>
      </div>
    </div>
  );
}
