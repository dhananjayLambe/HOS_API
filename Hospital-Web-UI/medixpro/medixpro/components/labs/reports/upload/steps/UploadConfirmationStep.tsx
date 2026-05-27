"use client";

import { OrderReportsChecklist } from "@/components/labs/reports/upload/shared/OrderReportsChecklist";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { UploadFileItem } from "@/hooks/labs/useReportUploadWizard";
import type { UploadTaskContext } from "@/lib/labs/reports/upload/upload-task-context-adapter";

type UploadConfirmationStepProps = {
  task: UploadTaskContext;
  files: UploadFileItem[];
  primaryFileName: string | null;
  verified: boolean;
  onVerifiedChange: (v: boolean) => void;
};

export function UploadConfirmationStep({
  task,
  files,
  primaryFileName,
  verified,
  onVerifiedChange,
}: UploadConfirmationStepProps) {
  return (
    <div className="space-y-4 rounded-xl border border-[#ECEBFF] bg-[#FAFAFF] p-4">
      <h3 className="text-sm font-semibold text-[#111827]">Confirm upload</h3>
      <div className="rounded-lg border border-[#ECEBFF] bg-white px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
          Uploading report for
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[#111827]">{task.uploadTestLabel}</p>
      </div>

      {task.reportLines.length > 0 ? (
        <OrderReportsChecklist lines={task.reportLines} progress={task.uploadProgress} />
      ) : null}

      <ul className="list-inside list-disc space-y-1 text-xs text-[#374151]">
        <li>
          Correct patient: <span className="font-medium text-[#111827]">{task.patientName}</span>
        </li>
        <li>
          Correct report files: <span className="font-medium text-[#111827]">{files.length} attached</span>
        </li>
        <li>
          Primary report selected:{" "}
          <span className="font-medium text-[#111827]">{primaryFileName ?? "—"}</span>
        </li>
      </ul>
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[#9CA3AF]">Visit / slot</dt>
          <dd className="font-medium text-[#111827]">{task.visitOrSlotLabel}</dd>
        </div>
        <div>
          <dt className="text-[#9CA3AF]">Order</dt>
          <dd className="font-medium text-[#111827]">#{task.orderNumber}</dd>
        </div>
      </dl>
      <div className="flex items-start gap-2 border-t border-[#ECEBFF] pt-3">
        <Checkbox
          id="verify-report"
          checked={verified}
          onCheckedChange={(c) => onVerifiedChange(c === true)}
        />
        <Label htmlFor="verify-report" className="text-sm font-normal leading-snug text-[#374151]">
          I verified this report is for <span className="font-medium text-[#111827]">{task.uploadTestLabel}</span>
          , the selected patient, and visit.
        </Label>
      </div>
    </div>
  );
}
