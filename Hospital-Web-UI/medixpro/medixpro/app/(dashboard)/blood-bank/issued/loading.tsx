import { Skeleton } from "@/components/ui/skeleton"
import { Shell } from "@/components/shell"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function IssuedLoading() {
  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[120px]" />
      </div>

      {/* Summary Cards Skeletons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-[120px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-[60px]" />
                <Skeleton className="h-4 w-[100px] mt-2" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Charts Skeletons */}
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 mt-6">
        <div className="flex w-full sm:w-auto items-center space-x-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10 hidden sm:block" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-[100px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="mt-6">
        <Skeleton className="h-10 w-[400px]" />
        <Card className="mt-4">
          <CardContent className="p-0">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    </Shell>
  )
}
