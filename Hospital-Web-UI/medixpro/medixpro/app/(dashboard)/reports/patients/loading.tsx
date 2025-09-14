import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PatientVisitReportLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-[250px]" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[100px]" />
            <Skeleton className="h-9 w-[100px]" />
          </div>
        </div>
        <Skeleton className="h-5 w-[350px]" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Skeleton className="h-10 w-full md:w-[300px]" />
          <Skeleton className="h-10 w-full md:w-[180px]" />
          <Skeleton className="h-10 w-full md:w-[180px]" />
        </div>
        <Skeleton className="h-10 w-full md:w-[320px]" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array(4)
          .fill(null)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[80px]" />
                <Skeleton className="mt-1 h-4 w-[140px]" />
              </CardContent>
            </Card>
          ))}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" disabled>
            <Skeleton className="h-4 w-[80px]" />
          </TabsTrigger>
          <TabsTrigger value="demographics" disabled>
            <Skeleton className="h-4 w-[80px]" />
          </TabsTrigger>
          <TabsTrigger value="trends" disabled>
            <Skeleton className="h-4 w-[80px]" />
          </TabsTrigger>
          <TabsTrigger value="conditions" disabled>
            <Skeleton className="h-4 w-[80px]" />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {Array(2)
              .fill(null)
              .map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                    <Skeleton className="h-4 w-[250px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[300px] w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-[180px]" />
                  <Skeleton className="mt-1 h-4 w-[220px]" />
                </div>
                <Skeleton className="h-9 w-[100px]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
