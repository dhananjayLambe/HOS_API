import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function PrescriptionDetailsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  ))}
              </div>

              <Skeleton className="h-px w-full" />

              <div>
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="space-y-4">
                  {Array(2)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array(5)
                              .fill(0)
                              .map((_, j) => (
                                <div key={j}>
                                  <Skeleton className="h-4 w-32 mb-2" />
                                  <Skeleton className="h-5 w-40" />
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>

              <Skeleton className="h-px w-full" />

              <div>
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array(2)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
