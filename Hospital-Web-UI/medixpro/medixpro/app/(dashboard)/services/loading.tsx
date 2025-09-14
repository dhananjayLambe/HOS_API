import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Clock, DollarSign, Stethoscope } from "lucide-react"

export default function ServicesLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="mt-2 h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[150px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-1 h-3 w-28" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-1 h-3 w-36" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-1 h-3 w-28" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-1 h-3 w-28" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Skeleton className="h-6 w-[180px]" />
              <Skeleton className="mt-2 h-4 w-[250px]" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Skeleton className="h-10 w-full sm:w-[250px]" />
              <Skeleton className="h-10 w-full sm:w-[100px]" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-6 h-10 w-[400px]" />

          {/* Department 1 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-5 w-[80px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={`dept1-${i}`} className="h-[150px] w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Department 2 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-[130px]" />
              <Skeleton className="h-5 w-[80px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={`dept2-${i}`} className="h-[150px] w-full rounded-lg" />
              ))}
            </div>
          </div>

          {/* Department 3 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-[140px]" />
              <Skeleton className="h-5 w-[80px]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={`dept3-${i}`} className="h-[150px] w-full rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
