import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function WorkingHoursLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array(7)
              .fill(null)
              .map((_, i) => (
                <div key={i} className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-4 w-4 rounded-sm" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex flex-1 items-center space-x-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
              ))}
            <Skeleton className="mt-4 h-8 w-full" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array(2)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex items-center justify-between space-x-4">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex flex-1 items-center space-x-2">
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </div>
                ))}
              <Skeleton className="mt-4 h-8 w-32" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-4 pt-4">
                {Array(2)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  ))}
                <Skeleton className="mt-4 h-8 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {Array(3)
              .fill(null)
              .map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-36" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-10" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
