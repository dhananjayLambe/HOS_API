import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function EditInventoryItemLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-64" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="grid gap-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            <div className="md:col-span-2 grid gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-6">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="grid gap-3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-10 w-full" />
                  {i === 1 && <Skeleton className="h-4 w-3/4" />}
                </div>
              ))}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="grid gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </div>
  )
}
