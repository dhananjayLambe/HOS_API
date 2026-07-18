"use client";

import Link from "next/link";
import { ExternalLink, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConsultationClinicalReportsPanel } from "@/components/doctor/diagnostic-reports-workspace/ConsultationClinicalReportsPanel";

type ConsultationReportsDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string | null;
  consultationId?: string | null;
  patientName?: string | null;
  /** Close drawer and focus Investigations for ordering new tests. */
  onOrderTests?: () => void;
};

/**
 * Clinical Decision Support entry: mid-consultation patient report panel
 * without leaving the consultation screen.
 */
export function ConsultationReportsDrawer({
  open,
  onOpenChange,
  patientId,
  consultationId,
  patientName,
  onOrderTests,
}: ConsultationReportsDrawerProps) {
  const workspaceHref = patientId
    ? `/lab-tests-reports?patientId=${encodeURIComponent(patientId)}${
        consultationId
          ? `&consultationId=${encodeURIComponent(consultationId)}`
          : ""
      }`
    : "/lab-tests-reports";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[min(96vw,780px)]"
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <div>
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="h-5 w-5" />
                Clinical reports
              </SheetTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {patientName
                  ? `What previous reports help diagnose ${patientName}?`
                  : "Patient reports for clinical decision support — stay in this consultation"}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={workspaceHref}>
                Full workspace
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </SheetHeader>
        <div className="flex-1 px-4 py-4">
          {patientId ? (
            <ConsultationClinicalReportsPanel
              patientId={patientId}
              consultationId={consultationId ?? null}
              onOrderTests={onOrderTests}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Select a patient before viewing clinical reports.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
