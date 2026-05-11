import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompletedPrescriptionLoading() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-white py-6 shadow-sm sm:flex-row sm:gap-3">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-center text-sm font-medium text-foreground">Opening prescription summary…</p>
      </div>
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
