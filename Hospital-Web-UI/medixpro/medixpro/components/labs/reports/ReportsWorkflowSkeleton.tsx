"use client";

export function ReportsWorkflowSkeleton() {
  return (
    <div className="space-y-3" aria-busy aria-label="Loading report workflow">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[#ECEBFF] bg-[#FAFAFF]/80 shadow-sm"
        >
          <div className="h-12 animate-pulse bg-[#F0EFFF]/80" />
          <div className="space-y-2 p-2">
            <div className="h-20 animate-pulse rounded-lg bg-[#F4F1FF]" />
            <div className="h-20 animate-pulse rounded-lg bg-[#F4F1FF]/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
