import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function PanelSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#ECEBFF] bg-white">
      <div className="flex gap-3 border-b border-[#ECEBFF]/90 px-5 py-4">
        <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-full max-w-[220px]" />
        </div>
      </div>
      <div className="space-y-0 px-5 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between gap-4 border-b border-[#F3F4F6] py-4 last:border-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32 max-w-[45%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function LabProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full max-w-full rounded-2xl" />
      <Skeleton className="h-52 w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
      <PanelSkeleton />
      <PanelSkeleton />
      <PanelSkeleton />
      <Card className="rounded-2xl border-[#ECEBFF]">
        <CardContent className="p-4">
          <Skeleton className="h-10 w-48" />
        </CardContent>
      </Card>
    </div>
  );
}
