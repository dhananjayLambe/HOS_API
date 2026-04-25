import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const HelpdeskQueueView = dynamic(
  () => import("@/components/helpdesk/HelpdeskQueueView").then((m) => ({ default: m.HelpdeskQueueView })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-1">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <div className="mt-4 grid min-h-[280px] gap-4 lg:grid-cols-2">
          <Skeleton className="h-full min-h-[240px] w-full rounded-xl" />
          <Skeleton className="hidden min-h-[240px] w-full rounded-xl lg:block" />
        </div>
      </div>
    ),
  }
);

export default function HelpdeskQueuePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HelpdeskQueueView />
    </div>
  );
}
