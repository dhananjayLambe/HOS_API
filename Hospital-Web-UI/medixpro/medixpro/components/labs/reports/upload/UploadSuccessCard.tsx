"use client";

import { Button } from "@/components/ui/button";
import { operationalStatusLabel } from "@/lib/labs/reports/report-operational-status";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";

type UploadSuccessCardProps = {
  task: ReportTask;
  status: ReportOperationalStatus;
  onSendWhatsApp: () => void;
  onUploadAnother: () => void;
  sending?: boolean;
};

export function UploadSuccessCard({
  task,
  status,
  onSendWhatsApp,
  onUploadAnother,
  sending,
}: UploadSuccessCardProps) {
  const patientQuery = encodeURIComponent(task.patientName);

  return (
    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-6 text-center shadow-sm">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
      <h2 className="mt-2 text-lg font-semibold text-[#111827]">Report uploaded successfully</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Status: <span className="font-medium text-[#111827]">{operationalStatusLabel(status)}</span>
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5"
          onClick={onSendWhatsApp}
          disabled={sending}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Send WhatsApp
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={onUploadAnother}>
          Upload another
        </Button>
        <Button type="button" variant="secondary" size="sm" className="h-9" asChild>
          <Link href="/lab-dashboard/reports/">Back to reports</Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-9" asChild>
          <Link href={`/lab-dashboard/reports/?q=${patientQuery}`}>View patient reports</Link>
        </Button>
      </div>
    </div>
  );
}
