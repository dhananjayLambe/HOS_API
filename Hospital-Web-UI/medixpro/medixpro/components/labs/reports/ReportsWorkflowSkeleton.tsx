"use client";

export function ReportsWorkflowSkeleton() {
  return (
    <div className="space-y-2" aria-busy aria-label="Loading report workflow">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[#D8D2FF] bg-[#F3F1FF] shadow-sm ring-1 ring-[#ECEBFF]/80"
        >
          <div className="h-12 animate-pulse bg-[#EDE9FF]/90" />
          <div className="space-y-1.5 p-2">
            <div className="h-[72px] animate-pulse rounded-md border border-[#ECEBFF] bg-[#F4F1FF]/80" />
            <div className="h-[72px] animate-pulse rounded-md border border-[#ECEBFF] bg-[#F4F1FF]/60" />
          </div>
        </div>
      ))}
    </div>
  );
}
