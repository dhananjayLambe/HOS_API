import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AllotedRoomsLoading() {
  return (
    <div className="space-y-4 p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array(4)
          .fill(null)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-[120px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-[250px]" />
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
            <Skeleton className="h-10 w-[130px]" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </div>

        <div className="rounded-md border">
          <div className="p-4">
            <div className="flex items-center space-x-4 py-4">
              <Skeleton className="h-6 w-[10%]" />
              <Skeleton className="h-6 w-[15%]" />
              <Skeleton className="h-6 w-[10%]" />
              <Skeleton className="h-6 w-[15%]" />
              <Skeleton className="h-6 w-[15%]" />
              <Skeleton className="h-6 w-[10%]" />
              <Skeleton className="h-6 w-[15%]" />
              <Skeleton className="h-6 w-[10%]" />
            </div>
            {Array(5)
              .fill(null)
              .map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4">
                  <Skeleton className="h-6 w-[10%]" />
                  <Skeleton className="h-6 w-[15%]" />
                  <Skeleton className="h-6 w-[10%]" />
                  <Skeleton className="h-6 w-[15%]" />
                  <Skeleton className="h-6 w-[15%]" />
                  <Skeleton className="h-6 w-[10%]" />
                  <Skeleton className="h-6 w-[15%]" />
                  <Skeleton className="h-6 w-[10%]" />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
