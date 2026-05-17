"use client";

import { HomeCollectionRowActions } from "@/components/labs/home-collections/HomeCollectionRowActions";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatAssignmentNoteDisplay } from "@/lib/labs/home-collections/format-assignment-note";
import type { LabCollectionRow } from "@/lib/labs/types";

function formatTs(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type Props = {
  row: LabCollectionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onAssign: (row: LabCollectionRow) => void;
  onStart: (row: LabCollectionRow) => void;
  onCollect: (row: LabCollectionRow) => void;
  onFail: (row: LabCollectionRow) => void;
  onRetry: (row: LabCollectionRow) => void;
};

export function CollectionDetailSheet({
  row,
  open,
  onOpenChange,
  busy,
  onAssign,
  onStart,
  onCollect,
  onFail,
  onRetry,
}: Props) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-2 border-b border-[#ECEBFF] px-4 py-4 text-left">
          <SheetTitle className="text-lg font-semibold">{row.patientName}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <LabStatusBadge domain="collection" status={row.status} />
            <span className="text-sm text-[#6B7280]">
              {row.slotDateLabel} · {row.slotTimeLabel}
            </span>
          </div>
        </SheetHeader>

        <section className="space-y-4 px-4 py-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Patient</h3>
            <p className="mt-1 text-sm">{row.patientName}</p>
            <p className="text-sm text-[#6B7280]">{row.patientPhone}</p>
            <p className="mt-1 text-sm text-[#111827]">{row.addressFormatted || "—"}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Tests</h3>
            <ul className="mt-2 space-y-1">
              {row.testNames.map((name) => (
                <li key={name} className="rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/60 px-3 py-2 text-sm">
                  {name}
                </li>
              ))}
              {row.testNamesOverflow > 0 ? (
                <li className="text-xs text-[#6B7280]">+{row.testNamesOverflow} more on order</li>
              ) : null}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Collection details</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[#6B7280]">Preferred</dt>
                <dd>
                  {row.preferredDate} · {row.preferredSlot}
                </dd>
              </div>
              {row.confirmedDate ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[#6B7280]">Confirmed</dt>
                  <dd>
                    {row.confirmedDate} · {row.confirmedSlot ?? "—"}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-2">
                <dt className="text-[#6B7280]">Assignment note</dt>
                <dd className="text-right">
                  {formatAssignmentNoteDisplay(row.status, row.assignmentNote)}
                </dd>
              </div>
              {row.patientNotes ? (
                <div>
                  <dt className="text-[#6B7280]">Notes</dt>
                  <dd className="mt-0.5">{row.patientNotes}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Workflow</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Assigned</span>
                <span className="text-[#6B7280]">{formatTs(row.assignedAt)}</span>
              </li>
              <li className="flex justify-between">
                <span>Started</span>
                <span className="text-[#6B7280]">{formatTs(row.inProgressAt)}</span>
              </li>
              <li className="flex justify-between">
                <span>Collected</span>
                <span className="text-[#6B7280]">{formatTs(row.collectedAt)}</span>
              </li>
              <li className="flex justify-between">
                <span>Failed</span>
                <span className="text-[#6B7280]">{formatTs(row.failedAt)}</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-[#6B7280]">{row.workflowHint}</p>
          </div>
        </section>

        <footer className="mt-auto border-t border-[#ECEBFF] px-4 py-4">
          <HomeCollectionRowActions
            row={row}
            busy={busy}
            onAssign={onAssign}
            onStart={onStart}
            onCollect={onCollect}
            onFail={onFail}
            onRetry={onRetry}
          />
        </footer>
      </SheetContent>
    </Sheet>
  );
}
