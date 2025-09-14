import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SupplierDetailsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Link href="/inventory/suppliers">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-2">
                  {Array(4)
                    .fill(null)
                    .map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-2">
                  {Array(3)
                    .fill(null)
                    .map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  <Skeleton className="mt-4 h-8 w-32" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array(4)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-2 h-6 w-16" />
                  </div>
                ))}
            </div>

            <Skeleton className="mt-4 h-6 w-32" />
            <div className="space-y-3">
              {Array(3)
                .fill(null)
                .map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="mt-1 h-3 w-12" />
                    </div>
                  </div>
                ))}
            </div>
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
