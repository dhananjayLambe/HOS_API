import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DoctorDashboardLoading() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Skeleton className="h-8 w-[200px]" />
          <div className="ml-auto flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
      </div>

      <main className="flex-1 space-y-6 p-6 md:p-8">
        <div className="flex flex-col space-y-2">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-5 w-[400px]" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-[120px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-[60px] mb-2" />
                  <Skeleton className="h-4 w-[140px] mb-4" />
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
        </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList className="grid grid-cols-4 md:w-[400px]">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="patients">Patients</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <Skeleton className="h-6 w-[180px] mb-2" />
                  <Skeleton className="h-4 w-[250px]" />
                </CardHeader>
                <CardContent>
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="mb-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-4 w-[100px]" />
                          </div>
                        </div>
                        <Skeleton className="h-8 w-[100px]" />
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <Skeleton className="h-6 w-[150px] mb-2" />
                  <Skeleton className="h-4 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
