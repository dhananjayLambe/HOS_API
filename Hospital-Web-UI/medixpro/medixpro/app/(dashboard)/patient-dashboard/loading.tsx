import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Shell } from "@/components/shell"

export default function PatientDashboardLoading() {
  return (
    <Shell>
      <div className="flex flex-col gap-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="mt-2 h-4 w-[350px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[150px]" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-[100px]" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-6 w-[100px]" />
                      <Skeleton className="mt-1 h-3 w-[120px]" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-[100px]" />
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[300px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-[150px]" />
                    <div className="space-y-2">
                      {Array(2)
                        .fill(0)
                        .map((_, j) => (
                          <Skeleton key={j} className="h-20 w-full" />
                        ))}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}
