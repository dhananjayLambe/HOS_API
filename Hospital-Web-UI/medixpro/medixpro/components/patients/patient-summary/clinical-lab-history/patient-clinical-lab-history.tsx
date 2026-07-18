"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  useClinicalLabHistoryList,
  useClinicalLabHistorySummary,
} from "./hooks/use-clinical-lab-history";
import { LabHistoryEmpty } from "./lab-history-empty";
import { LabHistoryKpiStrip } from "./lab-history-kpi-strip";
import { LabHistoryPreviewSheet } from "./lab-history-preview-sheet";
import { LabHistorySearch } from "./lab-history-search";
import { LabHistoryTimeline } from "./lab-history-timeline";
import type { ClinicalLabHistoryItem, ClinicalLabStatus } from "./types";

type Props = {
  patientId: string;
  focusReportId?: string | null;
};

export function PatientClinicalLabHistory({ patientId, focusReportId }: Props) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<ClinicalLabStatus | "">("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (focusReportId) setPreviewId(focusReportId);
  }, [focusReportId]);

  const filters = useMemo(
    () => ({
      q: debouncedQ,
      dateFrom,
      dateTo,
      status,
      pageSize: 25,
    }),
    [debouncedQ, dateFrom, dateTo, status]
  );

  const summaryQuery = useClinicalLabHistorySummary(patientId);
  const listQuery = useClinicalLabHistoryList(patientId, filters);

  const items = useMemo(
    () => listQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [listQuery.data]
  );

  const workspaceHref = `/lab-tests-reports?patientId=${encodeURIComponent(patientId)}`;

  function openWorkspace(item?: ClinicalLabHistoryItem) {
    const url = item
      ? `${workspaceHref}&reportId=${encodeURIComponent(item.id)}`
      : workspaceHref;
    window.location.href = url;
  }

  const showEmpty =
    !listQuery.isLoading && !listQuery.isError && items.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold tracking-tight text-slate-900">
          Clinical Lab History
        </p>
        <Link
          href={workspaceHref}
          className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Advanced Report Workspace
        </Link>
      </div>

      <LabHistoryKpiStrip
        summary={summaryQuery.data}
        loading={summaryQuery.isLoading}
      />

      <LabHistorySearch
        q={q}
        dateFrom={dateFrom}
        dateTo={dateTo}
        status={status}
        onQChange={setQ}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onStatusChange={setStatus}
      />

      {listQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading laboratory history…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-slate-500">
          Unable to load laboratory history. Try refreshing the page.
        </p>
      ) : showEmpty ? (
        <LabHistoryEmpty onOpenWorkspace={() => openWorkspace()} />
      ) : (
        <>
          <LabHistoryTimeline
            items={items}
            patientId={patientId}
            onPreview={(item) => setPreviewId(item.id)}
            onOpenWorkspace={openWorkspace}
          />
          {listQuery.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <LabHistoryPreviewSheet
        open={Boolean(previewId)}
        onOpenChange={(open) => {
          if (!open) setPreviewId(null);
        }}
        patientId={patientId}
        reportId={previewId}
      />
    </section>
  );
}
