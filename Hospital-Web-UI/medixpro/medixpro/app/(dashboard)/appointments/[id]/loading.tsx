import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function AppointmentDetailsLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to appointments</span>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Appointment Details</h1>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main appointment info */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <Skeleton className="h-8 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[250px]" />
            </div>
            <Skeleton className="h-6 w-[100px]" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date and time */}
              <div className="space-y-4">
                {Array(4)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 mt-0.5" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-5 w-[100px]" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Reason and notes */}
              <div className="space-y-4">
                {Array(2)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 mt-0.5" />
                      <div className="space-y-2 w-full">
                        <Skeleton className="h-5 w-[150px]" />
                        <Skeleton className="h-4 w-full" />
                        {i === 1 && <Skeleton className="h-4 w-full" />}
                        {i === 1 && <Skeleton className="h-4 w-3/4" />}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <Separator />

            {/* Vital signs */}
            <div>
              <Skeleton className="h-6 w-[120px] mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array(7)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="bg-muted rounded-lg p-3">
                      <Skeleton className="h-4 w-[80px] mb-2" />
                      <Skeleton className="h-5 w-[60px]" />
                    </div>
                  ))}
              </div>
            </div>
            <Separator />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-[200px]" />
          </CardFooter>
        </Card>

        {/* Patient and doctor info */}
        <div className="space-y-6">
          {/* Patient info */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[180px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-[150px] mb-1" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                {Array(3)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="grid grid-cols-[20px_1fr] gap-2 items-center">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
              </div>
              <div className="pt-2">
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Doctor info */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[180px]" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-[150px] mb-1" />
                  <Skeleton className="h-4 w-[120px]" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                {Array(2)
                  .fill(null)
                  .map((_, i) => (
                    <div key={i} className="grid grid-cols-[20px_1fr] gap-2 items-center">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
              </div>
              <div className="pt-2">
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
