import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function FeedbackLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-[120px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-[60px]" />
                <Skeleton className="h-4 w-[100px] mt-1" />
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="space-y-2">
        <div className="flex space-x-2">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-10 w-[100px]" />
            ))}
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-[130px]" />
          </div>
          <Skeleton className="h-5 w-[200px]" />
        </div>

        <div className="space-y-4 mt-4">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between">
                    <div>
                      <Skeleton className="h-6 w-[200px]" />
                      <Skeleton className="h-4 w-[300px] mt-2" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array(3)
                      .fill(0)
                      .map((_, j) => (
                        <div key={j} className="space-y-2">
                          <Skeleton className="h-4 w-[80px]" />
                          <Skeleton className="h-5 w-[60px]" />
                        </div>
                      ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-4 w-[40px]" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-4 w-[250px]" />
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
