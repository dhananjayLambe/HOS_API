import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"

export default function DoctorReviewsLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[150px]" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-8 w-full" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center justify-center space-y-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>

            <div className="col-span-2 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-[50px]" />
                  <Skeleton className="h-2 flex-1" />
                  <Skeleton className="h-4 w-[30px]" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-[80px]" />
          <Skeleton className="h-10 w-[130px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-4 w-[200px] ml-auto" />
      </div>

      {[1, 2, 3].map((i) => (
        <Card key={i} className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-[200px]" />
                  <div className="flex items-center gap-2 mt-1">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[80px]" />
                  </div>
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              {i % 2 === 0 && (
                <div className="bg-muted p-3 rounded-md">
                  <Skeleton className="h-4 w-[180px] mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-[120px]" />
              {i % 2 !== 0 && <Skeleton className="h-8 w-[100px]" />}
            </div>
            <Skeleton className="h-4 w-[150px]" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
