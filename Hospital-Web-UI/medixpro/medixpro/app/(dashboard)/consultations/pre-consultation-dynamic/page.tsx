"use client";

import { Suspense } from "react";
import { DynamicPreConsultation } from "@/components/consultations/dynamic-preconsultation";

export default function DynamicPreConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <DynamicPreConsultation />
    </Suspense>
  );
}
