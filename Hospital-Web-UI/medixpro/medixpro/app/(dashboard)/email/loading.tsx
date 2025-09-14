import { Mail } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function EmailLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Email</h1>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[100px]" />
        </div>
      </div>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="border-r p-4">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
            <div className="my-2 h-[1px] w-full bg-gray-200" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
            <div className="my-2 h-[1px] w-full bg-gray-200" />
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b p-4">
            <Skeleton className="h-10 w-[200px]" />
            <div className="flex items-center gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4 flex items-center gap-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-[200px]" />
                    <Skeleton className="h-5 w-[100px]" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t p-4">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
