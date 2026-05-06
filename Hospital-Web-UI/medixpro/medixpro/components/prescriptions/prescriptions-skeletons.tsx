"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function PrescriptionsFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Skeleton className="h-10 w-full max-w-sm" />
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

export function PrescriptionsTableRowSkeleton() {
  return (
    <div className="grid grid-cols-12 items-center gap-3 border-b px-4 py-3">
      <div className="col-span-3 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="col-span-2">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="col-span-2">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="col-span-2">
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="col-span-1">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="col-span-1">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="col-span-1 flex justify-end">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function PrescriptionsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="hidden md:block">
        {Array.from({ length: rows }).map((_, idx) => (
          <PrescriptionsTableRowSkeleton key={idx} />
        ))}
      </div>
      <div className="space-y-3 p-3 md:hidden">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-28" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrescriptionDrawerSkeleton() {
  return (
    <div className="space-y-4 p-1">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-xl border p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}
