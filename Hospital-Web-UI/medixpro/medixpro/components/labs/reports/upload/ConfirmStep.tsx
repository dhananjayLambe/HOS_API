"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";

type ConfirmStepProps = {
  task: ReportTask;
  files: UploadFileItem[];
  primaryFileName: string | null;
  verified: boolean;
  onVerifiedChange: (v: boolean) => void;
};

export function ConfirmStep({ task, files, primaryFileName, verified, onVerifiedChange }: ConfirmStepProps) {
  return (
    <div className="space-y-4 rounded-xl border border-[#ECEBFF] bg-[#FAFAFF] p-4">
      <h3 className="text-sm font-semibold text-[#111827]">Confirm upload</h3>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[#9CA3AF]">Patient</dt>
          <dd className="font-medium text-[#111827]">{task.patientName}</dd>
        </div>
        <div>
          <dt className="text-[#9CA3AF]">Report task</dt>
          <dd className="font-medium text-[#111827]">{task.testLabel}</dd>
        </div>
        <div>
          <dt className="text-[#9CA3AF]">Primary file</dt>
          <dd className="font-medium text-[#111827]">{primaryFileName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[#9CA3AF]">Total attachments</dt>
          <dd className="font-medium text-[#111827]">{files.length}</dd>
        </div>
      </dl>
      <div className="flex items-start gap-2 border-t border-[#ECEBFF] pt-3">
        <Checkbox
          id="verify-report"
          checked={verified}
          onCheckedChange={(c) => onVerifiedChange(c === true)}
        />
        <Label htmlFor="verify-report" className="text-sm font-normal leading-snug text-[#374151]">
          I verified the uploaded report
        </Label>
      </div>
    </div>
  );
}
