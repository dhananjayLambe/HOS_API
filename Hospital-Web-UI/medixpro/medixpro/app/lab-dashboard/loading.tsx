import { Skeleton } from "@/components/ui/skeleton";

export default function LabDashboardLoading() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <Skeleton className="h-9 w-full max-w-xl rounded-md" />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-[6.5rem] rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-[110px] rounded-2xl" />
        <Skeleton className="h-[110px] rounded-2xl" />
        <Skeleton className="h-[110px] rounded-2xl" />
      </div>
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
