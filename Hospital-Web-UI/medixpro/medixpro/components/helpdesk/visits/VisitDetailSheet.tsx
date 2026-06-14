"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchClinicalVisitDetail, type ClinicalVisitDetailApi } from "@/lib/api/visits";
import type { HelpdeskVisitRow } from "@/lib/helpdesk/mapVisitListRow";
import {
  formatVisitDateTime,
  visitStatusLabel,
  visitTypeLabel,
} from "@/lib/helpdesk/mapVisitListRow";
import axios from "axios";
import { useEffect, useState } from "react";

type Props = {
  row: HelpdeskVisitRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function sectionTitle(text: string) {
  return <h3 className="text-sm font-semibold tracking-tight">{text}</h3>;
}

function DetailBody({ detail }: { detail: ClinicalVisitDetailApi }) {
  const duration =
    detail.visit.duration_minutes != null ? `${detail.visit.duration_minutes} min` : "—";

  return (
    <div className="space-y-4 px-4 py-4">
      <section>
        {sectionTitle("Patient Information")}
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-right font-medium">{detail.patient.name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Age / Gender</dt>
            <dd className="text-right">
              {[detail.patient.age, detail.patient.gender].filter(Boolean).join(" · ") || "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Mobile</dt>
            <dd className="text-right">{detail.patient.mobile || "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">UHID</dt>
            <dd className="text-right font-mono text-xs">{detail.patient.uhid || "—"}</dd>
          </div>
        </dl>
      </section>

      <Separator />

      <section>
        {sectionTitle("Visit Information")}
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Visit ID</dt>
            <dd className="font-mono text-xs">{detail.visit_pnr}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{visitTypeLabel(detail.visit.visit_type)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Doctor</dt>
            <dd>{detail.visit.doctor_name}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Date &amp; time</dt>
            <dd>{formatVisitDateTime(detail.visit.started_at)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Duration</dt>
            <dd>{duration}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{visitStatusLabel(detail.visit.status)}</dd>
          </div>
        </dl>
      </section>

      <Separator />

      <section>
        {sectionTitle("Clinical Summary")}
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Chief complaints</p>
            {detail.clinical_summary.chief_complaints.length ? (
              <ul className="mt-1 list-disc pl-4">
                {detail.clinical_summary.chief_complaints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Diagnosis</p>
            {detail.clinical_summary.diagnosis.length ? (
              <ul className="mt-1 list-disc pl-4">
                {detail.clinical_summary.diagnosis.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Advice</p>
            {detail.clinical_summary.advice.length ? (
              <ul className="mt-1 list-disc pl-4">
                {detail.clinical_summary.advice.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </section>

      <Separator />

      <section>
        {sectionTitle("Prescription Summary")}
        {detail.prescription_lines.length ? (
          <ul className="mt-2 space-y-2">
            {detail.prescription_lines.map((line, idx) => (
              <li key={`${line.medicine_name}-${idx}`} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{line.medicine_name}</p>
                <p className="text-xs text-muted-foreground">
                  {[line.frequency, line.duration].filter(Boolean).join(" · ") || "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No prescription recorded.</p>
        )}
      </section>

      <Separator />

      <section>
        {sectionTitle("Tests Advised")}
        {detail.tests_advised.length ? (
          <ul className="mt-2 list-disc pl-4 text-sm">
            {detail.tests_advised.map((test) => (
              <li key={test}>{test}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No tests advised.</p>
        )}
      </section>

      <Separator />

      <section>
        {sectionTitle("Reports")}
        {detail.reports.length ? (
          <ul className="mt-2 space-y-2">
            {detail.reports.map((report) => (
              <li
                key={report.report_id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{report.test_label}</p>
                  <p className="text-xs text-muted-foreground">{report.status}</p>
                </div>
                {report.download_url ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={report.download_url} target="_blank" rel="noopener noreferrer">
                      Download
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No reports uploaded.</p>
        )}
      </section>
    </div>
  );
}

export function VisitDetailSheet({ row, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<ClinicalVisitDetailApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !row?.visitId) {
      setDetail(null);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchClinicalVisitDetail(row.visitId, { signal: controller.signal })
      .then(setDetail)
      .catch((err) => {
        if (axios.isCancel(err) || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Failed to load visit details.");
        setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, row?.visitId]);

  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="space-y-1 border-b px-4 py-4 text-left">
          <SheetTitle className="text-lg font-semibold">{row.patientName}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {row.visitPnr} · {visitTypeLabel(row.visitType)}
          </p>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="space-y-3 px-4 py-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-destructive">{error}</p>
          ) : detail ? (
            <DetailBody detail={detail} />
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
