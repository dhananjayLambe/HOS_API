"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function StartConsultationLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="h-10 w-10 animate-spin" />
      <p className="text-sm font-medium">Loading consultation…</p>
    </div>
  );
}

/** Heavy tree (all sections, action bar, panels) loads in a separate chunk — faster first paint and smaller initial dev compile for this route. */
const StartConsultationContent = dynamic(
  () => import("./start-consultation-content"),
  { loading: () => <StartConsultationLoading /> },
);

export default function StartConsultationPage() {
  return (
    <Suspense fallback={<StartConsultationLoading />}>
      <StartConsultationContent />
    </Suspense>
  );
}
