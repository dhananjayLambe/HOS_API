import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ReportsLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-[200px]" />
        <Skeleton className="h-5 w-[350px]" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array(6)
          .fill(null)
          .map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-6 w-[180px]" />
                </div>
                <Skeleton className="h-4 w-[250px]" />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-6">
                <div className="space-y-2">
                  {Array(3)
                    .fill(null)
                    .map((_, j) => (
                      <div key={j} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[60px]" />
                      </div>
                    ))}
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}
