import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PatientPrescriptionsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="text-center w-full">
                <Skeleton className="h-6 w-32 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto mt-1" />
                <Skeleton className="h-6 w-28 mx-auto mt-2" />
              </div>

              <div className="w-full space-y-2 pt-2">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
              </div>

              <div className="w-full pt-2 flex flex-col gap-2">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-8 w-16 mt-1" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-3/4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-10 w-[130px]" />
                <Skeleton className="h-10 w-[150px]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex gap-4 pb-2">
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                </div>
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex gap-4 py-4">
                      {Array(8)
                        .fill(0)
                        .map((_, j) => (
                          <Skeleton key={j} className="h-4 w-full" />
                        ))}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mt-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
      </div>
    </div>
  )
}
