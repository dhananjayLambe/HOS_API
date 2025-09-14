import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EditRoomAllotmentLoading() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Tabs defaultValue="patient-info">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patient-info" disabled>
            <Skeleton className="h-4 w-32" />
          </TabsTrigger>
          <TabsTrigger value="room-details" disabled>
            <Skeleton className="h-4 w-28" />
          </TabsTrigger>
          <TabsTrigger value="allotment-details" disabled>
            <Skeleton className="h-4 w-36" />
          </TabsTrigger>
          <TabsTrigger value="billing" disabled>
            <Skeleton className="h-4 w-16" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patient-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-48" />
              </CardTitle>
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array(6)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
