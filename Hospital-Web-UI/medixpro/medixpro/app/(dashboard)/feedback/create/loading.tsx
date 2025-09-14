import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function CreateSurveyLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-[250px]" />
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[250px] mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-4 w-[180px]" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-[180px]" />
            <Skeleton className="h-9 w-[120px]" />
          </div>

          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-[120px]" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-8 w-[100px]" />
                  </div>

                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-sm" />
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Skeleton className="h-px w-full" />

        <div className="flex justify-end gap-4">
          <Skeleton className="h-9 w-[100px]" />
          <Skeleton className="h-9 w-[120px]" />
        </div>
      </div>
    </div>
  )
}
