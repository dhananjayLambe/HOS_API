import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StaffLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(null)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-1" />
                <Skeleton className="h-3 w-[100px]" />
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Skeleton className="h-9 w-full md:w-[300px] lg:w-[400px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[80px]" />
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[130px]" />
          </div>
        </div>
        <Skeleton className="h-9 w-[120px]" />
      </div>

      <div>
        <Skeleton className="h-10 w-[300px] mb-4" />
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-[150px] mb-1" />
            <Skeleton className="h-4 w-[250px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {Array(5)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
