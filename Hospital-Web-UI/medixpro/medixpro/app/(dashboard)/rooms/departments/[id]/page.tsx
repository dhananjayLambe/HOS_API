"use client"

import { use, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Download, Edit, Printer, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import DepartmentDischargeModal from "@/components/rooms/department-discharge-modal"

// Mock data for a single room
const roomData = {
  id: "room-101",
  number: "101",
  type: "Private",
  status: "occupied",
  department: "Cardiology",
  floor: "1st Floor",
  wing: "East Wing",
  features: ["Private Bathroom", "Window View", "TV", "WiFi", "Nurse Call System"],
  lastCleaned: "2023-04-25T10:30:00",
  lastMaintenance: "2023-03-15T14:00:00",
  patient: {
    id: "patient-123",
    name: "John Smith",
    age: 45,
    gender: "Male",
    admissionDate: "2023-04-20T09:15:00",
    diagnosis: "Acute Myocardial Infarction",
    doctor: "Dr. Emily Chen",
    contactNumber: "+1 (555) 123-4567",
    emergencyContact: "Mary Smith (+1 (555) 987-6543)",
    insuranceProvider: "Blue Cross Blue Shield",
    insuranceNumber: "BCBS123456789",
    allergies: ["Penicillin", "Sulfa Drugs"],
    dietaryRestrictions: "Low Sodium",
  },
  history: [
    {
      date: "2023-04-20T09:15:00",
      event: "Patient Admitted",
      notes: "Patient admitted with chest pain and shortness of breath.",
      staff: "Dr. Emily Chen",
    },
    {
      date: "2023-04-21T11:30:00",
      event: "Medication Change",
      notes: "Started on beta blockers and aspirin.",
      staff: "Dr. Emily Chen",
    },
    {
      date: "2023-04-22T14:45:00",
      event: "Procedure",
      notes: "Coronary angiography performed.",
      staff: "Dr. James Wilson",
    },
    {
      date: "2023-04-24T10:00:00",
      event: "Consultation",
      notes: "Cardiology consultation with Dr. Lisa Wong.",
      staff: "Dr. Lisa Wong",
    },
  ],
  maintenanceHistory: [
    {
      date: "2023-03-15T14:00:00",
      type: "Routine Maintenance",
      notes: "Checked electrical outlets and nurse call system.",
      staff: "Maintenance Team",
    },
    {
      date: "2023-02-10T09:30:00",
      type: "Repair",
      notes: "Fixed leaking faucet in bathroom.",
      staff: "Plumbing Team",
    },
    {
      date: "2023-01-05T11:15:00",
      type: "Inspection",
      notes: "Annual safety inspection completed.",
      staff: "Facility Management",
    },
  ],
  cleaningHistory: [
    {
      date: "2023-04-25T10:30:00",
      type: "Daily Cleaning",
      notes: "Standard daily cleaning performed.",
      staff: "Housekeeping Staff",
    },
    {
      date: "2023-04-24T10:15:00",
      type: "Daily Cleaning",
      notes: "Standard daily cleaning performed.",
      staff: "Housekeeping Staff",
    },
    {
      date: "2023-04-23T11:00:00",
      type: "Deep Cleaning",
      notes: "Weekly deep cleaning of all surfaces and bathroom.",
      staff: "Housekeeping Team",
    },
  ],
}

export default function RoomDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false)

  const {id} = use(params)
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <Link href="/rooms/departments" className="flex items-center text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Rooms by Department
          </Link>
          <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Room {roomData.number} Details</h2>
          <p className="text-muted-foreground">
            {roomData.department} Department • {roomData.floor} • {roomData.wing}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {roomData.status === "occupied" && (
            <Button variant="destructive" onClick={() => setIsDischargeModalOpen(true)}>
              Discharge Patient
            </Button>
          )}
          <Link href={`/rooms/departments/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Room
            </Button>
          </Link>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Room Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Room Number</p>
                <p className="text-lg font-semibold">{roomData.number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Room Type</p>
                <p className="text-lg font-semibold">{roomData.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="text-lg font-semibold">{roomData.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={
                    roomData.status === "available"
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-red-100 text-red-800 hover:bg-red-100"
                  }
                >
                  {roomData.status === "available" ? "Available" : "Occupied"}
                </Badge>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Room Features</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {roomData.features.map((feature, index) => (
                  <Badge key={index} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Cleaned</p>
                <p className="text-sm">{formatDate(roomData.lastCleaned)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Maintenance</p>
                <p className="text-sm">{formatDate(roomData.lastMaintenance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {roomData.status === "occupied" && (
          <Card>
            <CardHeader>
              <CardTitle>Current Patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-100 p-2">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{roomData.patient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {roomData.patient.age} years • {roomData.patient.gender}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="sm:grid max-sm:space-y-4 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admission Date</p>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{formatDate(roomData.patient.admissionDate)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attending Physician</p>
                  <p className="text-sm">{roomData.patient.doctor}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Diagnosis</p>
                  <p className="text-sm">{roomData.patient.diagnosis}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Number</p>
                  <p className="text-sm">{roomData.patient.contactNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Emergency Contact</p>
                  <p className="text-sm">{roomData.patient.emergencyContact}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href={`/patients/${roomData.patient.id}`}>
                  <Button variant="link" className="h-auto p-0 text-sm">
                    View Full Patient Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="patient-history" className="w-full">
        <TabsList >
          <TabsTrigger value="patient-history">
            {roomData.status === "occupied" ? "Patient History" : "Room History"}
          </TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance History</TabsTrigger>
          <TabsTrigger value="cleaning">Cleaning History</TabsTrigger>
        </TabsList>
        <TabsContent value="patient-history" className="space-y-4">
          {roomData.status === "occupied" ? (
            <Card>
              <CardHeader>
                <CardTitle>Patient Room History</CardTitle>
                <CardDescription>History of events for the current patient in this room</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomData.history.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell>{item.event}</TableCell>
                        <TableCell>{item.staff}</TableCell>
                        <TableCell>{item.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Room Occupancy History</CardTitle>
                <CardDescription>Previous patients who occupied this room</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">No recent occupancy history available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>Record of maintenance activities for this room</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomData.maintenanceHistory.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.staff}</TableCell>
                      <TableCell>{item.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cleaning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cleaning History</CardTitle>
              <CardDescription>Record of cleaning activities for this room</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomData.cleaningHistory.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>{item.staff}</TableCell>
                      <TableCell>{item.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Discharge Modal */}
      <DepartmentDischargeModal
        isOpen={isDischargeModalOpen}
        onClose={() => setIsDischargeModalOpen(false)}
        roomId={id}
        roomNumber={roomData.number}
        patientName={roomData.patient?.name || ""}
        department={roomData.department}
      />
    </div>
  )
}
