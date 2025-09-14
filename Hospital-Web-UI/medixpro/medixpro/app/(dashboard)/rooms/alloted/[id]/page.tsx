"use client"
import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Printer,
  Download,
  User,
  Bed,
  CreditCard,
  ClipboardList,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import DischargePatientModal from "@/components/rooms/discharge-patient-modal"

// Mock data for a single room allotment
const allotment = {
  id: "RA-001",
  patientName: "John Smith",
  patientId: "P-1001",
  patientAge: 45,
  patientGender: "Male",
  patientContact: "+1 (555) 123-4567",
  patientEmail: "john.smith@example.com",
  patientAddress: "123 Main St, Anytown, CA 12345",
  roomNumber: "301",
  roomType: "Private",
  roomFloor: "3rd Floor",
  department: "Cardiology",
  allotmentDate: "2023-04-15",
  allotmentTime: "10:30 AM",
  expectedDischargeDate: "2023-04-20",
  actualDischargeDate: "",
  status: "occupied",
  doctor: "Dr. Emily Chen",
  doctorId: "D-2001",
  admissionReason: "Chest pain and shortness of breath",
  diagnosis: "Acute Myocardial Infarction",
  notes: "Patient requires regular monitoring of vital signs every 4 hours.",
  roomRate: 350,
  billingStatus: "Insurance Verified",
  insuranceProvider: "Blue Cross Blue Shield",
  insurancePolicyNumber: "BCBS-12345678",
  medicalHistory: [
    { date: "2022-10-05", description: "Hypertension diagnosis" },
    { date: "2021-06-12", description: "Appendectomy" },
    { date: "2020-03-20", description: "Influenza" },
  ],
  medications: [
    { name: "Aspirin", dosage: "81mg", frequency: "Once daily" },
    { name: "Atorvastatin", dosage: "40mg", frequency: "Once daily at bedtime" },
    { name: "Metoprolol", dosage: "25mg", frequency: "Twice daily" },
  ],
  vitals: [
    { date: "2023-04-15 11:00 AM", bp: "140/90", pulse: 88, temp: 98.6, respRate: 18, oxygenSat: 96 },
    { date: "2023-04-15 03:00 PM", bp: "135/85", pulse: 82, temp: 98.4, respRate: 16, oxygenSat: 97 },
    { date: "2023-04-16 07:00 AM", bp: "130/80", pulse: 76, temp: 98.2, respRate: 16, oxygenSat: 98 },
  ],
  roomFacilities: ["Private Bathroom", "TV", "WiFi", "Adjustable Bed", "Nurse Call System", "Oxygen Supply"],
  visitHistory: [
    {
      date: "2023-04-15 12:30 PM",
      staff: "Dr. Emily Chen",
      purpose: "Initial assessment",
      notes: "Prescribed medication and ordered tests",
    },
    {
      date: "2023-04-15 04:15 PM",
      staff: "Nurse Robert Johnson",
      purpose: "Medication administration",
      notes: "Administered prescribed medications",
    },
    {
      date: "2023-04-16 09:00 AM",
      staff: "Dr. Emily Chen",
      purpose: "Follow-up",
      notes: "Reviewed test results, patient showing improvement",
    },
  ],
}

export default function RoomAllotmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const {id} = use(params)
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <div className="flex items-center flex-wrap gap-2">
            <Link href="/rooms/alloted">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold tracking-tight">Room Allotment Details</h2>
            <Badge variant={allotment.status === "occupied" ? "default" : "secondary"}>
              {allotment.status === "occupied" ? "Occupied" : "Discharged"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Allotment ID: {id} | Room: {allotment.roomNumber} | Patient: {allotment.patientName}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {allotment.status === "occupied" && (
            <Button variant="outline" onClick={() => setIsDischargeModalOpen(true)}>
              Discharge Patient
            </Button>
          )}
          <Link href={`/rooms/alloted/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Name</p>
                <p>{allotment.patientName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Patient ID</p>
                <p>{allotment.patientId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Age</p>
                <p>{allotment.patientAge} years</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Gender</p>
                <p>{allotment.patientGender}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Contact</p>
                <p>{allotment.patientContact}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Email</p>
                <p>{allotment.patientEmail}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Address</p>
              <p>{allotment.patientAddress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bed className="mr-2 h-5 w-5" />
              Room Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Room Number</p>
                <p>{allotment.roomNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Room Type</p>
                <p>{allotment.roomType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Floor</p>
                <p>{allotment.roomFloor}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Department</p>
                <p>{allotment.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Daily Rate</p>
                <p>${allotment.roomRate}/day</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Facilities</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {allotment.roomFacilities.map((facility, index) => (
                  <Badge key={index} variant="outline">
                    {facility}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Allotment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Allotment Date</p>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {allotment.allotmentDate}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Allotment Time</p>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {allotment.allotmentTime}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Expected Discharge</p>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {allotment.expectedDischargeDate}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Actual Discharge</p>
                <div className="flex items-center">
                  {allotment.actualDischargeDate ? (
                    <>
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {allotment.actualDischargeDate}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Not discharged yet</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Attending Doctor</p>
                <p>{allotment.doctor}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Doctor ID</p>
                <p>{allotment.doctorId}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Admission Reason</p>
              <p>{allotment.admissionReason}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Diagnosis</p>
              <p>{allotment.diagnosis}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
              <p>{allotment.notes}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Billing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Billing Status</p>
                <p>{allotment.billingStatus}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Daily Room Rate</p>
                <p>${allotment.roomRate}.00</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Insurance Provider</p>
                <p>{allotment.insuranceProvider}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Policy Number</p>
                <p>{allotment.insurancePolicyNumber}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Charges</p>
              <div className="mt-2 rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Room Charges ({allotment.roomType})</TableCell>
                      <TableCell>${allotment.roomRate}/day</TableCell>
                      <TableCell>5</TableCell>
                      <TableCell className="text-right">${allotment.roomRate * 5}.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Nursing Care</TableCell>
                      <TableCell>$150/day</TableCell>
                      <TableCell>5</TableCell>
                      <TableCell className="text-right">$750.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Medications</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">$320.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Laboratory Tests</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">$450.00</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium text-right">
                        Total Estimated Charges
                      </TableCell>
                      <TableCell className="font-medium text-right">
                        ${allotment.roomRate * 5 + 750 + 320 + 450}.00
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="medical-info">
        <TabsList>
          <TabsTrigger value="medical-info">Medical Information</TabsTrigger>
          <TabsTrigger value="vitals">Vitals History</TabsTrigger>
          <TabsTrigger value="visit-history">Visit History</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
        </TabsList>
        <TabsContent value="medical-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                Medical History
              </CardTitle>
              <CardDescription>Patient's previous medical conditions and procedures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allotment.medicalHistory.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Vitals History
              </CardTitle>
              <CardDescription>Record of patient's vital signs during stay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Blood Pressure</TableHead>
                      <TableHead>Pulse</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Resp. Rate</TableHead>
                      <TableHead>O₂ Saturation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allotment.vitals.map((vital, index) => (
                      <TableRow key={index}>
                        <TableCell>{vital.date}</TableCell>
                        <TableCell>{vital.bp} mmHg</TableCell>
                        <TableCell>{vital.pulse} bpm</TableCell>
                        <TableCell>{vital.temp}°F</TableCell>
                        <TableCell>{vital.respRate} /min</TableCell>
                        <TableCell>{vital.oxygenSat}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="visit-history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                Visit History
              </CardTitle>
              <CardDescription>Record of healthcare staff visits during stay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allotment.visitHistory.map((visit, index) => (
                      <TableRow key={index}>
                        <TableCell>{visit.date}</TableCell>
                        <TableCell>{visit.staff}</TableCell>
                        <TableCell>{visit.purpose}</TableCell>
                        <TableCell>{visit.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="medications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                Current Medications
              </CardTitle>
              <CardDescription>Medications prescribed during current stay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allotment.medications.map((med, index) => (
                      <TableRow key={index}>
                        <TableCell>{med.name}</TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>{med.frequency}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DischargePatientModal
        isOpen={isDischargeModalOpen}
        onClose={() => setIsDischargeModalOpen(false)}
        allotmentId={id}
        patientName={allotment.patientName}
        roomNumber={allotment.roomNumber}
      />
    </div>
  )
}
