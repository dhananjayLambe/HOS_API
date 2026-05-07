import { Skeleton } from "@/components/ui/skeleton";

export function PatientListSkeletons() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-12 w-full md:max-w-[520px]" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="rounded-lg border border-border/50">
        <div className="space-y-2 p-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-14 w-full" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}
