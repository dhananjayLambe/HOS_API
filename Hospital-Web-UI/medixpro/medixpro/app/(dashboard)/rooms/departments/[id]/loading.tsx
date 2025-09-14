import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

export default function RoomDetailsLoading() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
            </div>
            <Separator />
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="mt-2 flex flex-wrap gap-2">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-6 w-24" />
                  ))}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-6 w-40" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="h-6 w-40 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className={i === 2 ? "col-span-2" : ""}>
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                ))}
            </div>
            <Separator />
            <div className="space-y-2">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patient-history" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patient-history" disabled>
            <Skeleton className="h-4 w-28" />
          </TabsTrigger>
          <TabsTrigger value="maintenance" disabled>
            <Skeleton className="h-4 w-36" />
          </TabsTrigger>
          <TabsTrigger value="cleaning" disabled>
            <Skeleton className="h-4 w-32" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="patient-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-48" />
              </CardTitle>
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                </div>
                <Separator />
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex space-x-4">
                      {Array(4)
                        .fill(0)
                        .map((_, j) => (
                          <Skeleton key={j} className="h-6 w-full" />
                        ))}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
