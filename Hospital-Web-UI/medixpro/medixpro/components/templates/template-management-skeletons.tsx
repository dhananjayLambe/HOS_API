"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function TemplateManagementFiltersSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <Skeleton className="mb-4 h-11 w-full rounded-lg" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function TemplateManagementListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="hidden border-b bg-muted/40 px-4 py-2.5 sm:block">
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 border-b px-4 py-4 last:border-b-0"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28 sm:hidden" />
          </div>
          <Skeleton className="hidden h-6 w-28 rounded-full sm:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-14" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
