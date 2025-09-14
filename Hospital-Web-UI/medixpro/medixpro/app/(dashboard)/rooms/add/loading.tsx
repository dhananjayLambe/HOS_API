import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function AddRoomLoading() {
  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-[250px]" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px]" />
          <Skeleton className="h-4 w-[350px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <Skeleton className="h-6 w-[180px]" />
                <Separator />
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
              </div>
              <div className="space-y-6">
                <Skeleton className="h-6 w-[180px]" />
                <Separator />
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-6">
              <Skeleton className="h-6 w-[150px]" />
              <Separator />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array(8)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-24 w-full" />
            </div>

            <div className="flex justify-end space-x-4">
              <Skeleton className="h-10 w-[100px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
