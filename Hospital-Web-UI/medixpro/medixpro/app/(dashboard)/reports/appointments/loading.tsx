import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AppointmentReportsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-[300px]" />
        <Skeleton className="h-5 w-[450px]" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[100px]" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(null)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
                <Skeleton className="mt-1 h-4 w-[140px]" />
                <Skeleton className="mt-4 h-1 w-full" />
              </CardContent>
            </Card>
          ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" disabled>
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" disabled>
            Trends
          </TabsTrigger>
          <TabsTrigger value="by-doctor" disabled>
            By Doctor
          </TabsTrigger>
          <TabsTrigger value="by-service" disabled>
            By Service
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[350px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[350px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-[180px]" />
                  <Skeleton className="h-4 w-[250px]" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-[150px] lg:w-[250px]" />
                  <Skeleton className="h-8 w-[80px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
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
