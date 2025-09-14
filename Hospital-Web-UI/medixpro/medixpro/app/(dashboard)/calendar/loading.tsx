import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function CalendarLoading() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-40" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`header-${i}`} className="h-8" />
            ))}
          </div>

          {Array.from({ length: 5 }).map((_, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1 mt-1">
              {Array.from({ length: 7 }).map((_, dayIndex) => (
                <Skeleton key={`day-${weekIndex}-${dayIndex}`} className="h-32" />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
