"use client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, Download, Edit, Printer, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

// Mock data for a blood unit
const bloodUnit = {
  id: "BS-001",
  bloodType: "A+",
  units: 12,
  collectionDate: "2023-04-15",
  expiryDate: "2023-05-15",
  status: "Available",
  location: "Refrigerator 1",
  donorId: "D-1045",
  donorName: "John Smith",
  donorAge: 32,
  donorGender: "Male",
  donorContact: "+1 (555) 123-4567",
  donorEmail: "john.smith@example.com",
  donorAddress: "123 Main St, Anytown, USA",
  donorBloodPressure: "120/80",
  donorHemoglobin: "14.5 g/dL",
  screeningResults: {
    hiv: "Negative",
    hepatitisB: "Negative",
    hepatitisC: "Negative",
    syphilis: "Negative",
    malaria: "Negative",
  },
  processingDetails: {
    processedBy: "Dr. Jane Wilson",
    processedDate: "2023-04-15",
    separationMethod: "Centrifugation",
    components: ["Red Blood Cells", "Plasma", "Platelets"],
    qualityCheck: "Passed",
  },
  notes: "Donor was in excellent health. Blood collected without complications.",
  history: [
    {
      date: "2023-04-15 09:30 AM",
      action: "Blood Collected",
      user: "Nurse Thompson",
      notes: "Collection completed successfully",
    },
    {
      date: "2023-04-15 10:15 AM",
      action: "Screening Completed",
      user: "Lab Tech Johnson",
      notes: "All screening tests negative",
    },
    {
      date: "2023-04-15 02:30 PM",
      action: "Processing Completed",
      user: "Dr. Jane Wilson",
      notes: "Blood processed and components separated",
    },
    {
      date: "2023-04-16 11:00 AM",
      action: "Quality Check",
      user: "Quality Officer Davis",
      notes: "All quality parameters within acceptable range",
    },
    {
      date: "2023-04-16 03:45 PM",
      action: "Storage",
      user: "Blood Bank Technician Lee",
      notes: "Stored in Refrigerator 1, Shelf B",
    },
  ],
};

export default function BloodUnitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDiscard = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // Redirect would happen here in a real app
      window.alert("Blood unit discarded successfully");
    }, 1000);
  };
  const { id } = use(params);
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/blood-bank/stock">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Blood Unit Details</h2>
          <Badge variant="outline" className="ml-2 font-bold">
            {bloodUnit.bloodType}
          </Badge>
          <Badge variant={bloodUnit.status === "Available" ? "success" : bloodUnit.status === "Reserved" ? "secondary" : "warning"}>{bloodUnit.status}</Badge>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print Label
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/blood-bank/stock/${id}/update`}>
              <Edit className="mr-2 h-4 w-4" />
              Update Status
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Discard Unit
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently discard this blood unit and remove it from the inventory.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDiscard} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Discarding...
                    </>
                  ) : (
                    "Discard Unit"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="donor">Donor Information</TabsTrigger>
          <TabsTrigger value="screening">Screening & Processing</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blood Unit Information</CardTitle>
              <CardDescription>Details about this blood unit</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Blood Unit ID</h4>
                  <p className="text-base font-medium">{bloodUnit.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Blood Type</h4>
                  <p className="text-base font-medium">{bloodUnit.bloodType}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Units</h4>
                  <p className="text-base font-medium">{bloodUnit.units} units</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                  <Badge variant={bloodUnit.status === "Available" ? "success" : bloodUnit.status === "Reserved" ? "secondary" : "warning"}>{bloodUnit.status}</Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Collection Date</h4>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <p className="text-base font-medium">{bloodUnit.collectionDate}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Expiry Date</h4>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <p className="text-base font-medium">{bloodUnit.expiryDate}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Storage Location</h4>
                  <p className="text-base font-medium">{bloodUnit.location}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Shelf Life Remaining</h4>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <p className="text-base font-medium">30 days</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">Last updated: {bloodUnit.history[bloodUnit.history.length - 1].date}</p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Additional information about this blood unit</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{bloodUnit.notes}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Donor Information</CardTitle>
              <CardDescription>Details about the blood donor</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Donor ID</h4>
                  <p className="text-base font-medium">
                    <Link href={`/blood-bank/donors/${bloodUnit.donorId}`} className="text-blue-500 hover:underline">
                      {bloodUnit.donorId}
                    </Link>
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Donor Name</h4>
                  <p className="text-base font-medium">{bloodUnit.donorName}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Age</h4>
                  <p className="text-base font-medium">{bloodUnit.donorAge} years</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Gender</h4>
                  <p className="text-base font-medium">{bloodUnit.donorGender}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Contact</h4>
                  <p className="text-base font-medium">{bloodUnit.donorContact}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Email</h4>
                  <p className="text-base font-medium">{bloodUnit.donorEmail}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                  <p className="text-base font-medium">{bloodUnit.donorAddress}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Donor Health Information</CardTitle>
              <CardDescription>Health details recorded during donation</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Blood Pressure</h4>
                <p className="text-base font-medium">{bloodUnit.donorBloodPressure}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Hemoglobin</h4>
                <p className="text-base font-medium">{bloodUnit.donorHemoglobin}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screening" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Screening Results</CardTitle>
              <CardDescription>Results of mandatory screening tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(bloodUnit.screeningResults).map(([test, result]) => (
                  <div key={test} className="flex flex-col space-y-1">
                    <h4 className="text-sm font-medium capitalize">{test}</h4>
                    <Badge variant={result === "Negative" ? "success" : "destructive"} className="w-fit">
                      {result}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processing Details</CardTitle>
              <CardDescription>Information about blood processing</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Processed By</h4>
                  <p className="text-base font-medium">{bloodUnit.processingDetails.processedBy}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Processed Date</h4>
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <p className="text-base font-medium">{bloodUnit.processingDetails.processedDate}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Separation Method</h4>
                  <p className="text-base font-medium">{bloodUnit.processingDetails.separationMethod}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Quality Check</h4>
                  <Badge variant="success" className="w-fit">
                    {bloodUnit.processingDetails.qualityCheck}
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardHeader className="pt-0">
              <CardTitle className="text-base">Components Separated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {bloodUnit.processingDetails.components.map((component) => (
                  <Badge key={component} variant="outline">
                    {component}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blood Unit History</CardTitle>
              <CardDescription>Chronological record of actions performed on this blood unit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-[1px] before:bg-border">
                {bloodUnit.history.map((event, index) => (
                  <div key={index} className="relative pl-6">
                    <div className="absolute left-[-5px] top-2 h-2.5 w-2.5 rounded-full bg-primary"></div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h4 className="font-medium">{event.action}</h4>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3 shrink-0" />
                          {event.date}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">By: {event.user}</p>
                      <p className="text-sm">{event.notes}</p>
                    </div>
                    {index < bloodUnit.history.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
