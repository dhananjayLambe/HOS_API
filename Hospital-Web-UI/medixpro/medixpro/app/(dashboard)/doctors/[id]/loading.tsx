import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DoctorProfileLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Loading */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-36 mt-4" />
            <Skeleton className="h-4 w-24 mt-2" />
            <Skeleton className="h-6 w-16 mt-2" />
            <div className="mt-4 flex items-center justify-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-4 w-4 mr-2 mt-1" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex flex-wrap gap-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16" />
                ))}
              </div>
            </div>
            <div className="pt-4 border-t">
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="space-y-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>

        {/* Main Content Loading */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview" disabled>
                Overview
              </TabsTrigger>
              <TabsTrigger value="appointments" disabled>
                Appointments
              </TabsTrigger>
              <TabsTrigger value="patients" disabled>
                Patients
              </TabsTrigger>
              <TabsTrigger value="performance" disabled>
                Performance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex justify-between">
                          <div>
                            <Skeleton className="h-4 w-40 mb-1" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-4 w-12" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex justify-between">
                          <div>
                            <Skeleton className="h-4 w-48 mb-1" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                          <Skeleton className="h-4 w-12" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-9 w-32" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <Skeleton className="h-4 w-16 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
