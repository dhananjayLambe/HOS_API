"use client";

import { Suspense } from "react";
import { PreConsultationView } from "./pre-consultation-view";

export default function PreConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <PreConsultationView />
    </Suspense>
  );
}
