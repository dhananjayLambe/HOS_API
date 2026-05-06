import { Skeleton } from "@/components/ui/skeleton";

export default function CompletedPrescriptionLoading() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-2 h-4 w-80" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
        <div className="space-y-4 lg:col-span-1">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>

      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}
