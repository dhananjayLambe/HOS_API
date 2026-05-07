"use client";

import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrescriptionPreviewDrawer } from "@/components/prescriptions/prescription-preview-drawer";
import type { PatientSummaryPayload } from "@/lib/mock/patient-summary";
import { downloadPrescriptionPdf, type PrescriptionListItem } from "@/lib/api/prescriptions";
import { useToastNotification } from "@/hooks/use-toast-notification";

type Prescription = PatientSummaryPayload["prescriptions"][number];

function toDrawerRow(prescription: Prescription, patientFullName?: string): PrescriptionListItem {
  return {
    consultation_id: prescription.consultation_id,
    prescription_id: prescription.id,
    pnr: prescription.prescription_pnr || prescription.id.slice(0, 12),
    is_cancelled: prescription.status === "CANCELLED",
    patient: { full_name: patientFullName },
  };
}

export function PatientPrescriptionCard({
  prescription,
  patientFullName,
}: {
  prescription: Prescription;
  patientFullName?: string;
}) {
  const toast = useToastNotification();
  const cancelled = prescription.status === "CANCELLED";
  const canUseApis = Boolean(prescription.consultation_id);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerRow = useMemo(() => {
    if (!canUseApis) return null;
    return toDrawerRow(prescription, patientFullName);
  }, [prescription, patientFullName, canUseApis]);

  const handlePreview = useCallback(() => {
    if (!canUseApis) return;
    setDrawerOpen(true);
  }, [canUseApis]);

  const handleDownload = useCallback(async () => {
    if (!canUseApis || cancelled) return;
    try {
      await downloadPrescriptionPdf(
        prescription.consultation_id,
        prescription.prescription_pnr || prescription.id,
      );
      toast.success("Prescription downloaded successfully");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to download prescription";
      toast.error(message);
    }
  }, [prescription, canUseApis, cancelled, toast]);

  return (
    <>
      <Card
        className={
          cancelled
            ? "relative overflow-hidden rounded-2xl border border-slate-200/40 bg-slate-50/50 opacity-60 shadow-none"
            : "relative overflow-hidden rounded-2xl border border-slate-200/40 bg-white shadow-none before:absolute before:left-0 before:top-4 before:h-10 before:w-[2px] before:rounded-full before:bg-emerald-400"
        }
      >
        <CardContent className="space-y-2 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{prescription.issued_on}</p>
            <Badge variant="outline" className="h-5 rounded-md border-slate-200/40 px-2 text-[10px] text-slate-600">
              {prescription.status}
            </Badge>
          </div>
          <p className="line-clamp-2 text-sm font-medium text-slate-900">{prescription.medicine_summary}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px] h-auto px-2 py-2 text-sm text-primary/70 hover:text-primary"
              disabled={!canUseApis}
              onClick={handlePreview}
            >
              Preview
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-[44px] h-auto px-2 py-2 text-sm text-primary/70 hover:text-primary"
              disabled={!canUseApis || cancelled}
              onClick={() => void handleDownload()}
            >
              Download
            </Button>
          </div>
        </CardContent>
      </Card>

      {drawerRow ? (
        <PrescriptionPreviewDrawer open={drawerOpen} onOpenChange={setDrawerOpen} row={drawerRow} />
      ) : null}
    </>
  );
}
