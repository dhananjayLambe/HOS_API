"use client";

import { Suspense } from "react";
import { DiagnosticReportsWorkspacePage } from "@/components/doctor/diagnostic-reports-workspace/DiagnosticReportsWorkspacePage";

function WorkspaceFallback() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <div className="grid w-full gap-2 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function LabTestsReportsPage() {
  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <DiagnosticReportsWorkspacePage />
    </Suspense>
  );
}
