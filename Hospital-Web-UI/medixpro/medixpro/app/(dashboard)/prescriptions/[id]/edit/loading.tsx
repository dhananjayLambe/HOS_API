import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function EditPrescriptionLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
              </div>

              <Skeleton className="h-px w-full" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-36" />
                </div>

                <div className="space-y-4">
                  {Array(2)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-4">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array(5)
                              .fill(0)
                              .map((_, j) => (
                                <div key={j} className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-10 w-full" />
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>

              <Skeleton className="h-px w-full" />

              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-36" />
            </CardFooter>
          </Card>
        </div>

        <div>
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
          </Card>
        </div>
      </div>
    </div>
  )
}
