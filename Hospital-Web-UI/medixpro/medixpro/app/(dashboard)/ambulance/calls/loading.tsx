import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AmbulanceCallListLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="mt-2 h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-full md:w-[180px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              <Skeleton className="h-5 w-[100px]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[50px]" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="mt-2 h-3 w-[120px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              <Skeleton className="h-5 w-[100px]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[50px]" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="mt-2 h-3 w-[120px]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              <Skeleton className="h-5 w-[150px]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[70px]" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="mt-2 h-3 w-[120px]" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="mt-2 h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Skeleton className="h-9 w-full md:w-[300px]" />
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Skeleton className="h-9 w-full md:w-[150px]" />
                <Skeleton className="h-9 w-full md:w-[180px]" />
              </div>
            </div>

            <Skeleton className="h-10 w-full" />

            <div className="mt-4 rounded-md border">
              <Skeleton className="h-[400px] w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
