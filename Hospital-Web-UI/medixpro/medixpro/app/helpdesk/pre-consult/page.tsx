import { Suspense } from "react";
import { HelpdeskPreConsultFallback } from "./pre-consult-client";

export default function HelpdeskPreConsultFallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
      }
    >
      <HelpdeskPreConsultFallback />
    </Suspense>
  );
}
