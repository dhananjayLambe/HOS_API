"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClinicalStatusBadge } from "@/components/clinical";
import type { ClinicalLabHistoryItem } from "./types";
import { CLINICAL_LAB_STATUS_LABELS } from "./types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function clinicalDate(item: ClinicalLabHistoryItem): string {
  return formatDate(item.reportDate || item.collectionDate || item.uploadedAt);
}

type Props = {
  item: ClinicalLabHistoryItem;
  compact?: boolean;
  patientId: string;
  onPreview: (item: ClinicalLabHistoryItem) => void;
  onOpenWorkspace: (item: ClinicalLabHistoryItem) => void;
};

export function LabHistoryCard({
  item,
  compact,
  patientId,
  onPreview,
  onOpenWorkspace,
}: Props) {
  const canPreview = item.clinicalStatus !== "AWAITING_REPORT";

  return (
    <div className="rounded-2xl border border-slate-200/40 bg-white/90 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs text-slate-500">{clinicalDate(item)}</p>
          <p className="text-sm font-semibold tracking-tight text-slate-900">{item.testName}</p>
          {item.category ? <p className="text-xs text-slate-500">{item.category}</p> : null}
          <p className="text-xs text-slate-600">
            {[item.labName, item.doctorName].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <ClinicalStatusBadge status={item.clinicalStatus} />
          {item.version > 1 || item.clinicalStatus === "UPDATED" ? (
            <span className="text-[11px] text-amber-700">
              {item.isLatest ? `Latest · v${item.version}` : `Version ${item.version}`}
            </span>
          ) : null}
        </div>
      </div>

      {!compact && item.clinicalFindingsPreview ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{item.clinicalFindingsPreview}</p>
      ) : null}

      {!compact && item.artifactCount > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          {item.primaryArtifactKind || "File"}
          {item.artifactCount > 1 ? ` · ${item.artifactCount} attachments` : ""}
        </p>
      ) : null}

      {/* Reserved zone for Trend / Compare / Clinical Notes / AI Summary */}
      <div className="mt-3 hidden" data-reserved="lab-history-future" aria-hidden />

      <div className="mt-3 flex flex-wrap gap-2">
        {canPreview ? (
          <Button
            variant="ghost"
            className="h-auto min-h-[40px] px-0 text-sm text-primary/80 hover:text-primary"
            onClick={() => onPreview(item)}
          >
            Preview
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="h-auto min-h-[40px] px-0 text-sm text-slate-600 hover:text-slate-900"
          onClick={() => onOpenWorkspace(item)}
        >
          Advanced Report Workspace
        </Button>
      </div>

      {!compact && item.consultationId ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Consultation</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-sm text-slate-700">
              {formatDate(item.reportDate || item.collectionDate)}
              {item.doctorName ? ` · Dr. ${item.doctorName.replace(/^Dr\.\s*/i, "")}` : ""}
            </p>
            <Link
              href={`/patients/${patientId}?tab=consultations`}
              className="text-sm font-medium text-primary/80 hover:text-primary"
            >
              Open →
            </Link>
          </div>
        </div>
      ) : null}

      {!compact && item.prescriptionId ? (
        <div className="mt-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Prescription</p>
          <Link
            href={`/patients/${patientId}?tab=prescriptions`}
            className="mt-1 inline-flex text-sm font-medium text-primary/80 hover:text-primary"
          >
            View Prescription →
          </Link>
        </div>
      ) : null}

      {compact ? (
        <p className="mt-2 text-xs text-slate-500">
          {CLINICAL_LAB_STATUS_LABELS[item.clinicalStatus]}
        </p>
      ) : null}
    </div>
  );
}
