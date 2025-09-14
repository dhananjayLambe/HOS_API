import { Skeleton } from "@/components/ui/skeleton"
import { Shell } from "@/components/shell"

export default function ContactsLoading() {
  return (
    <Shell>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4">
          <div className="flex flex-1 items-center space-x-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="rounded-md border">
          <div className="h-10 border-b bg-muted/50 px-4">
            <div className="flex h-full items-center">
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-2 py-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </Shell>
  )
}
