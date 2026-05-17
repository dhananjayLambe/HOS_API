"use client";

import { CollectionDetailTimelineSection } from "@/components/labs/home-collections/CollectionDetailTimelineSection";
import { CollectionDetailWorkflowSection } from "@/components/labs/home-collections/CollectionDetailWorkflowSection";
import { HomeCollectionRowActions } from "@/components/labs/home-collections/HomeCollectionRowActions";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatAssignmentNoteDisplay } from "@/lib/labs/home-collections/format-assignment-note";
import type { LabCollectionRow } from "@/lib/labs/types";

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
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l border-[#ECEBFF] bg-white p-0 sm:max-w-md">
        <SheetHeader className="space-y-2 border-b border-[#ECEBFF] px-4 py-4 text-left">
          <SheetTitle className="text-lg font-semibold">{row.patientName}</SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <LabStatusBadge domain="collection" status={row.status} />
            <span className="text-sm text-[#6B7280]">
              {row.slotDateLabel} · {row.slotTimeLabel}
            </span>
            <span className="text-xs text-[#6B7280]">Order {row.orderNumber}</span>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-4">
            <section>
              <h3 className={sectionTitle}>Patient</h3>
              <p className="mt-1 text-sm">{row.patientName}</p>
              <p className="text-sm text-[#6B7280]">{row.patientPhone}</p>
              <p className="mt-1 text-sm text-[#111827]">{row.addressFormatted || "—"}</p>
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Tests</h3>
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
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Collection details</h3>
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
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <CollectionDetailWorkflowSection row={row} />

            <Separator className="bg-[#ECEBFF]" />

            <CollectionDetailTimelineSection row={row} />
          </div>
        </ScrollArea>

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
