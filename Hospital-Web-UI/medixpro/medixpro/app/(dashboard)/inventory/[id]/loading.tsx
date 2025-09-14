import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryItemDetailsLoading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-24" />
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <div className="space-y-2">
                    {Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="grid grid-cols-[1fr_2fr] gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <div className="space-y-2">
                    {Array(6)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="grid grid-cols-[1fr_2fr] gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              <div>
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>

              <Separator className="my-4" />

              <div>
                <Skeleton className="h-5 w-16 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-32" />
            </CardFooter>
          </Card>
        </div>

        <div className="w-full md:w-80">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="grid gap-2">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" disabled>
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" disabled>
            Stock History
          </TabsTrigger>
          <TabsTrigger value="related" disabled>
            Related Items
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Skeleton className="h-5 w-32 mb-4" />
                  <Skeleton className="aspect-[4/3] w-full" />
                </div>
                <div>
                  <Skeleton className="h-5 w-40 mb-4" />
                  <Skeleton className="aspect-[4/3] w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  )
}
