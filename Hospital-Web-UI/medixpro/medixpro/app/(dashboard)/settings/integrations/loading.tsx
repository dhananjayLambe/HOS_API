import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function IntegrationsLoading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <Skeleton className="h-10 w-[400px]" />

      <div className="space-y-6 pt-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array(3)
            .fill(null)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="mt-1 h-4 w-full" />
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-1 h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-full" />
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
