import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddServiceLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Skeleton className="h-8 w-[250px]" />
          <Skeleton className="mt-2 h-4 w-[350px]" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-[200px]" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[300px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-[80px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-[100px] w-full" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Skeleton className="h-5 w-[100px]" />
                <Skeleton className="h-[120px] w-full" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-[120px] w-full" />
                <Skeleton className="h-4 w-[300px]" />
              </div>
            </div>

            <div className="flex justify-end">
              <Skeleton className="h-10 w-[180px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
