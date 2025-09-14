import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-[200px] mb-2" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Skeleton className="h-4 w-[100px]" />
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex items-center space-x-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-[100px] w-full rounded-md" />
            </div>

            <div className="flex justify-end space-x-2">
              <Skeleton className="h-10 w-[100px] rounded-md" />
              <Skeleton className="h-10 w-[150px] rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
