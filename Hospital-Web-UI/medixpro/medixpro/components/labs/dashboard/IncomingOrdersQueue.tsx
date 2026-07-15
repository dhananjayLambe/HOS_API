"use client";

import { dashboardQueueTableClassName } from "@/components/labs/dashboard/dashboard-table-styles";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { labBtnSecondary } from "@/components/labs/labDesignTokens";
import { PremiumTable } from "@/components/labs/premium/PremiumTable";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { ActionButton } from "@/components/labs/premium/ActionButton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASHBOARD_QUEUE_CAP } from "@/lib/labs/dashboard/constants";
import {
  minutesWaitingSince,
  WAITING_SINCE_TONE_CLASS,
  waitingSinceTone,
} from "@/lib/labs/dashboard/waiting-since";
import type { LabOrderRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Inbox, Loader2, Phone } from "lucide-react";
import Link from "next/link";

type IncomingOrdersQueueProps = {
  rows: LabOrderRow[];
  total: number;
  acceptingId: string | null;
  onAccept: (order: LabOrderRow) => void;
  onView: (order: LabOrderRow) => void;
  className?: string;
};

function waitingSinceLabel(order: LabOrderRow): string {
  const iso = order.assignedAtIso ?? null;
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

function WaitingSinceCell({ order }: { order: LabOrderRow }) {
  const iso = order.assignedAtIso ?? null;
  const minutes = minutesWaitingSince(iso);
  const tone = waitingSinceTone(minutes);
  return (
    <span className={cn("whitespace-nowrap text-xs", WAITING_SINCE_TONE_CLASS[tone])}>
      {waitingSinceLabel(order)}
    </span>
  );
}

const openOrdersBtnClass = cn(
  labBtnSecondary,
  "h-8 border-[color:rgba(124,92,252,0.35)] bg-[#F4F1FF] px-3 text-xs font-semibold text-[#6D4FF5] shadow-sm no-underline",
  "hover:border-[#7C5CFC]/50 hover:bg-[#EDE8FF] hover:text-[#5B3FE8]",
);

export function IncomingOrdersQueue({
  rows,
  total,
  acceptingId,
  onAccept,
  onView,
  className,
}: IncomingOrdersQueueProps) {
  const visible = rows.slice(0, DASHBOARD_QUEUE_CAP);
  const hasMore = total > DASHBOARD_QUEUE_CAP;

  return (
    <SectionCard
      compact
      operationalHeader
      title={
        <span className="inline-flex items-center gap-2">
          <Inbox className="h-4 w-4 shrink-0 text-[#7C5CFC]" strokeWidth={2} aria-hidden />
          <span>Incoming orders</span>
          <span className="rounded-md bg-[#F4F1FF] px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[#6D4FF5]">
            {total}
          </span>
        </span>
      }
      className={cn("flex min-h-0 flex-col", className)}
      action={
        <Link href="/lab-dashboard/orders/?status=PENDING" className={openOrdersBtnClass}>
          {hasMore ? `View all (${total})` : "Open orders"}
        </Link>
      }
    >
      {visible.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-[#6B7280]">No pending orders — new referrals appear here.</p>
      ) : (
        <PremiumTable
          maxHeightClass="max-h-[min(20rem,38vh)]"
          className={cn(dashboardQueueTableClassName, "overflow-y-auto")}
        >
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="w-[24%]">Patient</TableHead>
                <TableHead className="w-[32%]">Tests</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[18%]">Waiting</TableHead>
                <TableHead className="w-[12%] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((o) => (
                <TableRow key={o.assignmentId} className="border-0">
                  <TableCell className="font-semibold text-[#111827]">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{o.patient}</span>
                      {o.patientPhone ? (
                        <a
                          href={`tel:${o.patientPhone}`}
                          className="shrink-0 text-[#6D4FF5] hover:text-[#7C5CFC]"
                          aria-label={`Call ${o.patient}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="h-3.5 w-3.5" strokeWidth={2} />
                        </a>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-[#6B7280]">{o.tests.map((t) => t.name).join(", ")}</TableCell>
                  <TableCell>
                    <LabStatusBadge domain="order" status={o.status} />
                  </TableCell>
                  <TableCell>
                    <WaitingSinceCell order={o} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <ActionButton
                        className="h-8 shrink-0 px-2 text-[11px]"
                        disabled={acceptingId === o.assignmentId}
                        onClick={() => onAccept(o)}
                      >
                        {acceptingId === o.assignmentId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          "Accept"
                        )}
                      </ActionButton>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 rounded-lg px-1.5 text-[11px] text-[#6B7280]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(o);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </PremiumTable>
      )}
    </SectionCard>
  );
}
