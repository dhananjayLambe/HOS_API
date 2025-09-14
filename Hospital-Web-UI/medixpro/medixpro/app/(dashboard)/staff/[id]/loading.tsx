import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs } from "@/components/ui/tabs"

export default function StaffProfileLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="mt-4 h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-2 h-5 w-16" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
              <div className="mt-4 grid w-full grid-cols-4 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-2 h-20 w-full" />
                </div>

                <div>
                  <Skeleton className="h-5 w-32" />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-32" />
                    ))}
                  </div>
                </div>

                <div>
                  <Skeleton className="h-5 w-32" />
                  <div className="grid gap-2 mt-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
