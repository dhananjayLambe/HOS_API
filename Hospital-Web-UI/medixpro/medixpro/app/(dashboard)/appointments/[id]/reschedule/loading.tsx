import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function RescheduleAppointmentLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to appointment details</span>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Reschedule Appointment</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Reschedule Information</CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-[250px]" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-20 w-full rounded-lg" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[100px]" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[100px]" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-5 w-[150px]" />
                  <Skeleton className="h-[100px] w-full" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>

                <div className="space-y-2 pt-2">
                  <Skeleton className="h-5 w-[120px]" />
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-[300px]" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-[300px]" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-2">
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-10 w-[180px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-[80px] mb-1" />
                  <Skeleton className="h-4 w-[120px]" />
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-[80px] mb-1" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 mt-0.5" />
                      <div>
                        <Skeleton className="h-5 w-[100px] mb-1" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
