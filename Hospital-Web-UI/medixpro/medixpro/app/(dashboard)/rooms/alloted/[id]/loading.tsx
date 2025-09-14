import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function RoomAllotmentDetailsLoading() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {Array(4)
          .fill(null)
          .map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-6 w-48" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Array(6)
                    .fill(null)
                    .map((_, i) => (
                      <div key={i}>
                        <Skeleton className="mb-1 h-4 w-24" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                </div>
                <div>
                  <Skeleton className="mb-1 h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Tabs defaultValue="medical-info">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="medical-info" disabled>
            <Skeleton className="h-4 w-32" />
          </TabsTrigger>
          <TabsTrigger value="vitals" disabled>
            <Skeleton className="h-4 w-24" />
          </TabsTrigger>
          <TabsTrigger value="visit-history" disabled>
            <Skeleton className="h-4 w-28" />
          </TabsTrigger>
          <TabsTrigger value="medications" disabled>
            <Skeleton className="h-4 w-24" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="medical-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-48" />
              </CardTitle>
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
