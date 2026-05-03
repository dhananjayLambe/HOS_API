"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const preConsultFallback = (
  <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
    Loading…
  </div>
);

const PreConsultationView = dynamic(
  () => import("./pre-consultation-view").then((m) => ({ default: m.PreConsultationView })),
  { loading: () => preConsultFallback },
);

export default function PreConsultationPage() {
  return (
    <Suspense fallback={preConsultFallback}>
      <PreConsultationView />
    </Suspense>
  );
}
