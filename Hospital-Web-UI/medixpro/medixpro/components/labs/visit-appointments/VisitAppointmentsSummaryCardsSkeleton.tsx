"use client";

import { labStatusCardShell } from "@/components/labs/labDesignTokens";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function VisitAppointmentsSummaryCardsSkeleton({ className }: { className?: string }) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-5", className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn(labStatusCardShell, "p-4")}>
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="mt-3 h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-14" />
        </div>
      ))}
    </section>
  );
}
