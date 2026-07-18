"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClinicalEmptyState, ClinicalStatusBadge } from "@/components/clinical";
import {
  BROWSER_PAGE_SIZE,
  type WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import {
  rowHover,
  rowSelected,
  rowZebra,
  surfaceSection,
  typeMeta,
  typeTableHead,
} from "@/lib/design-system/clinical";
import { cn } from "@/lib/utils";

function formatShortDate(iso: string | null): string {
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

type PatientReportBrowserProps = {
  reports: WorkspaceReport[];
  loading?: boolean;
  layout?: "table" | "cards";
  page: number;
  onPageChange: (page: number) => void;
  /** When set, pagination is server/cursor driven (one API page per `page`). */
  serverHasMore?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onPreview: (report: WorkspaceReport) => void;
  hidePatientColumn?: boolean;
  selectedReportId?: string | null;
};

export function PatientReportBrowser({
  reports,
  loading,
  layout = "table",
  page,
  onPageChange,
  serverHasMore,
  emptyTitle = "No reports found",
  emptyDescription = "No reports match your filters. Try clearing filters or searching by patient.",
  emptyActionLabel,
  onEmptyAction,
  onPreview,
  hidePatientColumn,
  selectedReportId,
}: PatientReportBrowserProps) {
  const [highlightIndex, setHighlightIndex] = useState(0);

  const serverPaged = serverHasMore !== undefined;
  const safePage = Math.max(1, page);
  const canGoNext = serverPaged
    ? Boolean(serverHasMore)
    : safePage < Math.max(1, Math.ceil(reports.length / BROWSER_PAGE_SIZE));
  const canGoPrev = safePage > 1;
  const totalPagesLabel = String(
    Math.max(1, Math.ceil(reports.length / BROWSER_PAGE_SIZE))
  );
  const pageSlice = useMemo(() => {
    if (serverPaged) return reports;
    const start = (safePage - 1) * BROWSER_PAGE_SIZE;
    return reports.slice(start, start + BROWSER_PAGE_SIZE);
  }, [reports, safePage, serverPaged]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [safePage, reports.length]);

  useEffect(() => {
    if (layout !== "table") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, Math.max(pageSlice.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const row = pageSlice[highlightIndex];
        if (row && row.clinicalStatus !== "AWAITING_REPORT") onPreview(row);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [layout, pageSlice, highlightIndex, onPreview]);

  if (loading) {
    return (
      <div
        className={cn(
          surfaceSection,
          "p-6 text-center text-sm text-[hsl(var(--clinical-text-secondary))]"
        )}
      >
        Loading reports…
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <ClinicalEmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  const pagination = (
    <div className="flex items-center justify-between gap-2 border-t border-[hsl(var(--clinical-divider))] px-3 py-2 text-sm">
      <p className="text-[hsl(var(--clinical-text-secondary))]">
        {reports.length} report{reports.length === 1 ? "" : "s"}
        {serverPaged ? " on this page" : ""} · Page {safePage}
        {serverPaged ? (serverHasMore ? "+" : "") : ` of ${totalPagesLabel}`}
      </p>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canGoPrev}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canGoNext}
          onClick={() => onPageChange(safePage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (layout === "cards") {
    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {pageSlice.map((report) => {
            const selected = selectedReportId === report.id;
            return (
              <Card
                key={report.id}
                className={cn(
                  "cursor-pointer overflow-hidden border-[hsl(var(--clinical-border-subtle))] transition-colors duration-150 hover:bg-[hsl(var(--clinical-surface-interactive))]",
                  selected &&
                    "border-l-[3px] border-l-primary bg-[hsl(var(--clinical-accent-available-soft))]"
                )}
                onClick={() => {
                  if (report.clinicalStatus !== "AWAITING_REPORT") onPreview(report);
                }}
              >
                <CardContent className="space-y-2 p-3">
                  {!hidePatientColumn ? (
                    <div>
                      <p className="text-sm font-medium leading-tight">{report.patient.name}</p>
                      <p className={typeMeta}>{report.patient.identifier}</p>
                      <p className={typeMeta}>
                        {report.patient.age ?? "—"}Y · {report.patient.gender}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm font-semibold leading-tight">{report.testName}</p>
                    <p className={typeMeta}>{report.reportNumber}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ClinicalStatusBadge status={report.clinicalStatus} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {pagination}
      </div>
    );
  }

  return (
    <div className={cn(surfaceSection, "overflow-hidden")}>
      <div className="max-h-[min(70vh,720px)] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-[1] bg-[hsl(var(--clinical-surface-section)/0.95)] backdrop-blur-sm shadow-sm">
            <TableRow className="hover:bg-transparent">
              {!hidePatientColumn ? (
                <TableHead className={cn("h-8 py-1.5", typeTableHead)}>Patient</TableHead>
              ) : null}
              <TableHead className={cn("h-8 py-1.5", typeTableHead)}>Test</TableHead>
              <TableHead className={cn("h-8 py-1.5", typeTableHead)}>Status</TableHead>
              <TableHead className={cn("hidden h-8 py-1.5 md:table-cell", typeTableHead)}>
                Report date
              </TableHead>
              <TableHead className={cn("hidden h-8 py-1.5 lg:table-cell", typeTableHead)}>
                Lab
              </TableHead>
              <TableHead className={cn("h-8 w-[132px] py-1.5", typeTableHead)}>
                Patient Summary
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageSlice.map((report, idx) => {
              const awaiting = report.clinicalStatus === "AWAITING_REPORT";
              const selected = selectedReportId === report.id;
              const highlighted = highlightIndex === idx;
              return (
                <TableRow
                  key={report.id}
                  tabIndex={0}
                  title={awaiting ? "Awaiting results" : "Open preview"}
                  className={cn(
                    "cursor-pointer border-l-[3px] border-l-transparent",
                    rowZebra,
                    rowHover,
                    awaiting && "cursor-default opacity-80",
                    (highlighted || selected) && !selected && "bg-[hsl(var(--clinical-surface-interactive))]",
                    selected && rowSelected
                  )}
                  onClick={() => {
                    setHighlightIndex(idx);
                    if (!awaiting) onPreview(report);
                  }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  {!hidePatientColumn ? (
                    <TableCell className="py-1.5 align-middle">
                      <p className="text-sm font-medium leading-tight">{report.patient.name}</p>
                      <p className={cn(typeMeta, "leading-tight")}>{report.patient.identifier}</p>
                      <p className={cn(typeMeta, "leading-tight")}>
                        {report.patient.age ?? "—"}Y · {report.patient.gender}
                      </p>
                    </TableCell>
                  ) : null}
                  <TableCell className="py-1.5 align-middle">
                    <p className="text-sm font-medium leading-tight">{report.testName}</p>
                    <p className={typeMeta}>{report.reportNumber}</p>
                  </TableCell>
                  <TableCell className="py-1.5 align-middle">
                    <div className="flex flex-col items-start gap-1">
                      <ClinicalStatusBadge status={report.clinicalStatus} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden py-1.5 text-sm md:table-cell">
                    {formatShortDate(report.reportDate ?? report.uploadedAt)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "hidden py-1.5 lg:table-cell",
                      typeMeta
                    )}
                  >
                    {report.labName}
                  </TableCell>
                  <TableCell className="py-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button asChild size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
                      <Link href={`/patients/${report.patient.id}?tab=labs`}>
                        <UserRound className="h-3.5 w-3.5" />
                        Patient Summary
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {pagination}
    </div>
  );
}
