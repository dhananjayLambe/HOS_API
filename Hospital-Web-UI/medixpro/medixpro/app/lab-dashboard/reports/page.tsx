"use client";

import { ReportsCompletionPage } from "@/components/labs/reports/ReportsCompletionPage";
import { ReportsListPage } from "@/components/labs/reports/ReportsListPage";
import { isOrderCompletionUxEnabled } from "@/lib/labs/reports/report-tasks-config";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LabReportsRouteContent() {
  const searchParams = useSearchParams();
  const legacy = searchParams.get("legacy") === "1";
  const useCompletionUx = isOrderCompletionUxEnabled() && !legacy;

  if (useCompletionUx) {
    return <ReportsCompletionPage />;
  }

  return <ReportsListPage />;
}

export default function LabReportsRoutePage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-[#6B7280]">Loading reports…</p>}>
      <LabReportsRouteContent />
    </Suspense>
  );
}
