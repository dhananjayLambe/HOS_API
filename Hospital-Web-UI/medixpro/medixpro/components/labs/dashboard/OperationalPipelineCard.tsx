"use client";

import { dashboardPipelineTableClassName } from "@/components/labs/dashboard/dashboard-table-styles";
import { PipelineEmptyState } from "@/components/labs/dashboard/PipelineEmptyState";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { labBtnSecondary } from "@/components/labs/labDesignTokens";
import { PremiumTable } from "@/components/labs/premium/PremiumTable";
import { SectionCard } from "@/components/labs/premium/SectionCard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASHBOARD_PIPELINE_CAP } from "@/lib/labs/dashboard/constants";
import type { DashboardReportPipelineRow } from "@/lib/labs/dashboard/report-pipeline";
import type { LabCollectionRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

function CardTitleWithCount({ title, total }: { title: string; total: number }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate text-base font-semibold">{title}</span>
      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          total > 0 ? "bg-[#F4F1FF] text-[#6D4FF5]" : "bg-slate-100 text-slate-500",
        )}
      >
        {total}
      </span>
    </span>
  );
}

type OperationalPipelineCardProps = {
  title: string;
  viewAllHref: string;
  total: number;
  emptyMessage: string;
  isEmpty?: boolean;
  className?: string;
  children: ReactNode;
};

export function OperationalPipelineCard({
  title,
  viewAllHref,
  total,
  emptyMessage,
  isEmpty = false,
  className,
  children,
}: OperationalPipelineCardProps) {
  const hasMore = total > DASHBOARD_PIPELINE_CAP;

  return (
    <SectionCard
      compact
      title={<CardTitleWithCount title={title} total={total} />}
      className={cn(
        "flex min-h-0 flex-col",
        isEmpty ? "min-h-[110px]" : "min-h-[220px]",
        className,
      )}
      action={
        <Link
          href={viewAllHref}
          className={cn(
            labBtnSecondary,
            "h-7 border-[color:rgba(124,92,252,0.25)] bg-[#F4F1FF]/80 px-2 text-[10px] font-medium text-[#6D4FF5] no-underline",
          )}
        >
          {hasMore ? `+${total - DASHBOARD_PIPELINE_CAP} more` : "Open"}
        </Link>
      }
    >
      {children ?? <PipelineEmptyState message={emptyMessage} />}
    </SectionCard>
  );
}

type CollectionsPipelineBodyProps = {
  rows: LabCollectionRow[];
};

export function CollectionsPipelineBody({ rows }: CollectionsPipelineBodyProps) {
  const visible = rows.slice(0, DASHBOARD_PIPELINE_CAP);
  if (visible.length === 0) {
    return <PipelineEmptyState message="No collections scheduled today." />;
  }

  return (
    <PremiumTable
      maxHeightClass="max-h-[min(11rem,24vh)] overflow-y-auto"
      className={dashboardPipelineTableClassName}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead>Patient</TableHead>
            <TableHead>Slot</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((c) => (
            <TableRow key={c.id} className="border-0">
              <TableCell className="max-w-[90px] truncate font-semibold text-[#111827]">{c.patientName}</TableCell>
              <TableCell className="whitespace-nowrap text-[#6B7280]">
                {c.slotDateLabel} {c.slotTimeLabel}
              </TableCell>
              <TableCell>
                <LabStatusBadge domain="collection" status={c.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PremiumTable>
  );
}

type ReportPipelineBodyProps = {
  rows: DashboardReportPipelineRow[];
  actionLabel: string;
  actionHref: string;
};

export function ReportPipelineBody({ rows, actionLabel, actionHref }: ReportPipelineBodyProps) {
  const visible = rows.slice(0, DASHBOARD_PIPELINE_CAP);
  if (visible.length === 0) {
    return null;
  }

  return (
    <PremiumTable
      maxHeightClass="max-h-[min(11rem,24vh)] overflow-y-auto"
      className={dashboardPipelineTableClassName}
    >
      <Table>
        <TableHeader>
          <TableRow className="border-0 hover:bg-transparent">
            <TableHead>Patient</TableHead>
            <TableHead>Tests</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((r) => (
            <TableRow key={r.id} className="border-0">
              <TableCell className="max-w-[80px] truncate font-semibold text-[#111827]">{r.patient}</TableCell>
              <TableCell className="max-w-[100px] truncate text-[#6B7280]">{r.testsLabel}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[10px]" asChild>
                  <Link href={actionHref}>{actionLabel}</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PremiumTable>
  );
}
