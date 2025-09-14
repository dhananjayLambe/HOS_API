import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      {/* Summary Cards Skeletons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[50px] mb-2" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Blood Type Chart Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[200px] mb-2" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(8)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center">
                  <Skeleton className="h-4 w-12" />
                  <div className="flex-1 mx-4">
                    <Skeleton className="h-4 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters and Actions Skeletons */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-2 md:space-y-0">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      {/* Tabs and Table Skeletons */}
      <div>
        <Skeleton className="h-10 w-[400px] mb-4" />
        <div className="rounded-md border">
          <div className="p-4">
            <div className="flex items-center space-x-4 pb-4">
              {Array(9)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
            </div>
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4 border-t">
                  {Array(9)
                    .fill(0)
                    .map((_, j) => (
                      <Skeleton key={j} className="h-4 w-full" />
                    ))}
                </div>
              ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-4 w-[200px]" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-8 w-[100px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
