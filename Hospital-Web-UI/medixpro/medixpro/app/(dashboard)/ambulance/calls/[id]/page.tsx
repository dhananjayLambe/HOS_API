"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Ambulance, ArrowLeft, Calendar, Check, Clock, Edit, FileText, MapPin, Phone, Printer, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

// Sample ambulance call data
const ambulanceCallData = {
  id: "AC001",
  date: "2023-04-22",
  time: "08:30 AM",
  patient: "John Doe",
  patientId: "P12345",
  age: 65,
  gender: "Male",
  contact: "+1 (555) 123-4567",
  location: "123 Main St, Anytown, NY 10001",
  coordinates: { lat: 40.7128, lng: -74.006 },
  reason: "Chest Pain",
  description: "Patient experiencing severe chest pain radiating to left arm. History of cardiac issues.",
  status: "Completed",
  priority: "High",
  ambulance: "AMB-001",
  driver: "Michael Johnson",
  paramedic: "Sarah Wilson",
  dispatchTime: "08:32 AM",
  arrivalTime: "08:45 AM",
  hospitalArrivalTime: "09:10 AM",
  completionTime: "09:45 AM",
  hospital: "Memorial Hospital",
  vitalSigns: {
    bloodPressure: "140/90",
    heartRate: "95",
    respiratoryRate: "18",
    oxygenSaturation: "94%",
    temperature: "37.2°C",
    bloodGlucose: "110 mg/dL",
  },
  medications: [
    { name: "Aspirin", dosage: "325mg", time: "08:50 AM" },
    { name: "Nitroglycerin", dosage: "0.4mg", time: "08:55 AM" },
  ],
  notes: "Patient stabilized during transport. ECG showed ST elevation. Administered aspirin and nitroglycerin per protocol.",
  timeline: [
    { time: "08:30 AM", event: "Call received", status: "Pending" },
    { time: "08:32 AM", event: "Ambulance dispatched", status: "Dispatched" },
    { time: "08:45 AM", event: "Arrived at location", status: "In Progress" },
    { time: "08:55 AM", event: "Patient assessment completed", status: "In Progress" },
    { time: "09:00 AM", event: "Transport to hospital started", status: "In Progress" },
    { time: "09:10 AM", event: "Arrived at hospital", status: "In Progress" },
    { time: "09:45 AM", event: "Call completed", status: "Completed" },
  ],
};

export default function AmbulanceCallDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.id as string;
  const [status, setStatus] = useState(ambulanceCallData.status);
  const [note, setNote] = useState("");

  // In a real app, you would fetch the call data based on the ID
  const call = ambulanceCallData;

  if (!call) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Ambulance Call Not Found</h1>
        <p className="text-muted-foreground">The ambulance call you are looking for does not exist.</p>
        <Button className="mt-4" onClick={() => router.push("/ambulance/calls")}>
          Back to Call List
        </Button>
      </div>
    );
  }

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    // In a real app, you would update the status in the database
  };

  const handleAddNote = () => {
    if (note.trim()) {
      // In a real app, you would add the note to the database
      alert("Note added successfully");
      setNote("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/ambulance/calls">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl mb-2 font-bold tracking-tight">Ambulance Call Details</h2>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Call ID: {call.id}</p>
            <Badge variant={status === "Completed" ? "default" : status === "In Progress" ? "secondary" : status === "Pending" ? "outline" : "destructive"}>{status}</Badge>
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
                    <p>
                      {call.date} at {call.time}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Reason</h3>
                  <p>{call.reason}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Priority</h3>
                  <Badge variant={call.priority === "High" ? "destructive" : "default"}>{call.priority}</Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Hospital</h3>
                  <p>{call.hospital}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Ambulance</h3>
                  <div className="flex items-center gap-2">
                    <Ambulance className="h-4 w-4 text-muted-foreground" />
                    <Link href={`/ambulance/details?id=${call.ambulance}`} className="hover:underline">
                      {call.ambulance}
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Crew</h3>
                  <p>
                    Driver: {call.driver}
                    <br />
                    Paramedic: {call.paramedic}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Response Time</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p>13 minutes</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between py-4 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap ">
              <p className="text-sm text-muted-foreground">Update Status:</p>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Print Report
              </Button>
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
                  <Link href={`/patients/details?id=${call.patientId}`} className="font-medium hover:underline">
                    {call.patient}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {call.age} years, {call.gender}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Contact</h3>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p>{call.contact}</p>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p>{call.location}</p>
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="aspect-video bg-muted">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.952912260219!2d3.375295414770757!3d6.5275945952697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8b2ae68280c1%3A0xdc9e87a367c3d9cb!2sLagos%2C%20Nigeria!5e0!3m2!1sen!2s!4v1647675283790!5m2!1sen!2s"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span>Distance: 3.2 miles</span>
                  <span>ETA: 8 mins</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button className="w-full" variant="outline">
              Get Directions
            </Button>
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
              <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-[2px] before:bg-border">
                {call.timeline.map((event, index) => (
                  <div key={index} className="relative">
                    <div className={`absolute -left-[25px] top-1 h-4 w-4 rounded-full ${event.status === "Completed" ? "bg-primary" : event.status === "In Progress" ? "bg-secondary" : "bg-muted"}`} />
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.time}</span>
                        <Badge variant={event.status === "Completed" ? "default" : event.status === "In Progress" ? "secondary" : "outline"} className="ml-2">
                          {event.status}
                        </Badge>
                      </div>
                      <p>{event.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Medical Details</CardTitle>
              <CardDescription>Patient's medical information and vital signs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-2 font-medium">Description</h3>
                  <p className="text-sm">{call.description}</p>
                </div>

                <div>
                  <h3 className="mb-2 font-medium">Vital Signs</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Blood Pressure</p>
                      <p className="text-lg font-medium">{call.vitalSigns.bloodPressure}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Heart Rate</p>
                      <p className="text-lg font-medium">{call.vitalSigns.heartRate} bpm</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Respiratory Rate</p>
                      <p className="text-lg font-medium">{call.vitalSigns.respiratoryRate} breaths/min</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Oxygen Saturation</p>
                      <p className="text-lg font-medium">{call.vitalSigns.oxygenSaturation}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Temperature</p>
                      <p className="text-lg font-medium">{call.vitalSigns.temperature}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">Blood Glucose</p>
                      <p className="text-lg font-medium">{call.vitalSigns.bloodGlucose}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 font-medium">Medications Administered</h3>
                  {call.medications.length > 0 ? (
                    <div className="space-y-2">
                      {call.medications.map((med, index) => (
                        <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-sm text-muted-foreground">Dosage: {med.dosage}</p>
                          </div>
                          <p className="text-sm">{med.time}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No medications administered</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Call notes and additional information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="whitespace-pre-line text-sm">{call.notes}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="mb-2 font-medium">Add Note</h3>
                  <Textarea placeholder="Enter additional notes here..." value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[100px]" />
                  <Button className="mt-2" onClick={handleAddNote}>
                    Add Note
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Reports and documents related to this call</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Incident Report</p>
                      <p className="text-sm text-muted-foreground">PDF • 2.3 MB • Added on {call.date}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Patient Care Record</p>
                      <p className="text-sm text-muted-foreground">PDF • 1.8 MB • Added on {call.date}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">ECG Results</p>
                      <p className="text-sm text-muted-foreground">JPG • 0.5 MB • Added on {call.date}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button className="w-full" variant="outline">
                Upload Document
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end gap-2 flex-wrap">
        <Button variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit Call
        </Button>
        <Button variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
        <Button disabled={status === "Completed"} onClick={() => handleStatusChange("Completed")}>
          <Check className="mr-2 h-4 w-4" />
          Complete Call
        </Button>
      </div>
    </div>
  );
}
