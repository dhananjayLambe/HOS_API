"use client";

import {
  isSpreadsheetFile,
  parseSpreadsheetPreview,
  type SpreadsheetPreviewData,
} from "@/lib/labs/reports/parse-spreadsheet-preview";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type SpreadsheetPreviewPanelProps = {
  file: File;
  fileName: string;
};

export function SpreadsheetPreviewPanel({ file, fileName }: SpreadsheetPreviewPanelProps) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; data: SpreadsheetPreviewData }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    void parseSpreadsheetPreview(file).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", data: result.data });
      } else {
        setState({ status: "error", message: result.error });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [file, fileName]);

  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-[#6B7280]">
        <Loader2 className="h-4 w-4 animate-spin text-[#7C5CFC]" aria-hidden />
        Loading spreadsheet preview…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <p className="rounded-md border border-amber-200/80 bg-amber-50/60 px-2 py-1.5 text-xs text-amber-900">
        {state.message}
      </p>
    );
  }

  const { data } = state;
  const [headerRow, ...bodyRows] = data.rows;

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[10px] text-[#6B7280]">
        Sheet: <span className="font-medium text-[#374151]">{data.sheetName}</span>
        {data.truncated ? " · Showing first rows/columns" : null}
      </p>
      <div className="max-h-48 overflow-auto rounded-md border border-[#ECEBFF]">
        <table className="w-full min-w-[240px] border-collapse text-left text-[10px]">
          {headerRow?.length ? (
            <thead className="sticky top-0 bg-[#F4F1FF]">
              <tr>
                {headerRow.map((cell, i) => (
                  <th
                    key={`h-${i}`}
                    className="border-b border-[#ECEBFF] px-2 py-1 font-semibold text-[#374151]"
                  >
                    {cell || "—"}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {(headerRow?.length ? bodyRows : data.rows).map((row, ri) => (
              <tr key={ri} className="odd:bg-white even:bg-[#FAFAFF]">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-b border-[#F0EFFF] px-2 py-1 text-[#111827]">
                    {cell || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
