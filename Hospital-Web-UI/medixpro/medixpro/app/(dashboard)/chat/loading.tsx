import { Skeleton } from "@/components/ui/skeleton"

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with conversations */}
        <div className="w-80 border-r bg-background">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="mt-2">
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="px-4">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-1 h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4">
            <div className="space-y-4">
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-20 w-64 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-16 w-56 rounded-lg" />
              </div>
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-24 w-72 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end">
                <Skeleton className="h-20 w-64 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Message input */}
          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
