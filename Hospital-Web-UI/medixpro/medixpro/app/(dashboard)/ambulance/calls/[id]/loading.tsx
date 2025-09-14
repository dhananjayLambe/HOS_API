import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, MapPin, UserRound } from "lucide-react";
import Link from "next/link";

export default function AmbulanceCallDetailsLoading() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/ambulance/calls">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ambulance Call Details</h1>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">
              Call ID: <Skeleton className="inline-block h-4 w-16" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Call Summary</CardTitle>
            <CardDescription>Overview of the ambulance call</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Date & Time</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Reason</h3>
                  <Skeleton className="h-4 w-40" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Hospital</h3>
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Ambulance</h3>
                  <Skeleton className="h-4 w-24" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Crew</h3>
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-1 h-4 w-36" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Response Time</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Update Status:</p>
              <Skeleton className="h-9 w-[180px]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-24" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                <Skeleton className="h-4 w-36" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <div className="rounded-md border p-2">
                <Skeleton className="aspect-video w-full" />
                <div className="mt-2 flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="medical">Medical Details</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Timeline</CardTitle>
              <CardDescription>Chronological events of the ambulance call</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="h-4 w-16" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-60" />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
