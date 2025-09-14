import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PatientHistoryLoading() {
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
        </div>

        <div className="w-full md:w-3/4">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-9" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted pl-6 pb-2">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="mb-8 relative">
                      <Skeleton className="absolute -left-10 mt-1.5 h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-6 w-48 mb-1" />
                      <Skeleton className="h-4 w-36 mb-1" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="diagnoses">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="diagnoses" disabled>
                  Diagnoses
                </TabsTrigger>
                <TabsTrigger value="visits" disabled>
                  Visits
                </TabsTrigger>
                <TabsTrigger value="procedures" disabled>
                  Procedures
                </TabsTrigger>
                <TabsTrigger value="immunizations" disabled>
                  Immunizations
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Skeleton className="h-10 w-[200px]" />
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>

            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-4 pb-2">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                  </div>
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex gap-4 py-4">
                        {Array(5)
                          .fill(0)
                          .map((_, j) => (
                            <Skeleton key={j} className="h-4 w-full" />
                          ))}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
