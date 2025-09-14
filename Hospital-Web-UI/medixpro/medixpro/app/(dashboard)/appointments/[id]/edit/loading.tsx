import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function EditAppointmentLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to appointment details</span>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Edit Appointment</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Information</CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-[350px]" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {Array(5)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-[100px]" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
              </div>

              <div className="space-y-4">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-[120px]" />
                      <Skeleton className="h-10 w-full" />
                      {i === 3 && <Skeleton className="h-4 w-[250px] mt-1" />}
                    </div>
                  ))}
              </div>
            </div>

            <Separator />

            <div className="flex justify-between">
              <Skeleton className="h-10 w-[180px]" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-10 w-[150px]" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
