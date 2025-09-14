"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Edit,
  MapPin,
  User,
  Activity,
  Clipboard,
  AlertCircle,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Sample data for a death record
const deathRecord = {
  id: "DR-2023-001",
  personalInfo: {
    fullName: "Robert Anderson",
    gender: "Male",
    dateOfBirth: "1945-02-15",
    age: 78,
    placeOfBirth: "Chicago, Illinois",
    nationality: "American",
    address: "123 Oak Street, Springfield, IL 62701",
    maritalStatus: "Married",
    occupation: "Retired Engineer",
  },
  deathInfo: {
    dateOfDeath: "2023-05-10",
    timeOfDeath: "14:30",
    placeOfDeath: "City General Hospital",
    causeOfDeath: "Natural causes - Congestive Heart Failure",
    mannerOfDeath: "Natural",
  },
  medicalInfo: {
    attendingPhysician: "Dr. James Wilson",
    medicalExaminer: "Dr. Emily Carter",
    autopsyPerformed: "No",
    autopsyFindings: "",
  },
  additionalInfo: {
    informantName: "Sarah Anderson",
    informantRelationship: "Spouse",
    informantContact: "(555) 123-4567",
    notes: "Patient had a history of heart disease and was under hospice care for the last month.",
  },
  status: "Verified",
  createdBy: "Dr. James Wilson",
  createdAt: "2023-05-10T16:45:00",
  verifiedBy: "Dr. Emily Carter",
  verifiedAt: "2023-05-11T10:30:00",
}

// Sample audit history
const auditHistory = [
  {
    action: "Record Created",
    user: "Dr. James Wilson",
    timestamp: "2023-05-10T16:45:00",
    details: "Initial death record created",
  },
  {
    action: "Record Updated",
    user: "Dr. James Wilson",
    timestamp: "2023-05-10T17:20:00",
    details: "Updated cause of death details",
  },
  {
    action: "Record Verified",
    user: "Dr. Emily Carter",
    timestamp: "2023-05-11T10:30:00",
    details: "Death record verified and finalized",
  },
]

export default function DeathRecordDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("details")

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold tracking-tight">Death Record: {deathRecord.id}</h2>
            <p className="text-muted-foreground">View and manage death record details</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push(`/records/death/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Record
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Download Certificate
          </Button>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-4">
        <Badge
          variant={deathRecord.status === "Verified" ? "default" : "outline"}
          className={
            deathRecord.status === "Verified"
              ? "bg-green-100 text-green-800 hover:bg-green-100"
              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
          }
        >
          {deathRecord.status}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {deathRecord.status === "Verified"
            ? `Verified by ${deathRecord.verifiedBy} on ${new Date(deathRecord.verifiedAt).toLocaleString()}`
            : "Pending verification"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Record Details</TabsTrigger>
          <TabsTrigger value="history">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                  <p>{deathRecord.personalInfo.fullName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Gender</p>
                  <p>{deathRecord.personalInfo.gender}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p>{new Date(deathRecord.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Age at Death</p>
                  <p>{deathRecord.personalInfo.age} years</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Place of Birth</p>
                  <p>{deathRecord.personalInfo.placeOfBirth}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                  <p>{deathRecord.personalInfo.nationality}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Last Known Address</p>
                  <p>{deathRecord.personalInfo.address}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Marital Status</p>
                  <p>{deathRecord.personalInfo.maritalStatus}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                  <p>{deathRecord.personalInfo.occupation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Death Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Date of Death</p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(deathRecord.deathInfo.dateOfDeath).toLocaleDateString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Time of Death</p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {deathRecord.deathInfo.timeOfDeath}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Place of Death</p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {deathRecord.deathInfo.placeOfDeath}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Manner of Death</p>
                  <p>{deathRecord.deathInfo.mannerOfDeath}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Cause of Death</p>
                  <p>{deathRecord.deathInfo.causeOfDeath}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Medical Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Attending Physician</p>
                  <p>{deathRecord.medicalInfo.attendingPhysician}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Medical Examiner/Coroner</p>
                  <p>{deathRecord.medicalInfo.medicalExaminer}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Autopsy Performed</p>
                  <p>{deathRecord.medicalInfo.autopsyPerformed}</p>
                </div>
                {deathRecord.medicalInfo.autopsyFindings && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Autopsy Findings</p>
                    <p>{deathRecord.medicalInfo.autopsyFindings}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clipboard className="h-5 w-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Informant Name</p>
                  <p>{deathRecord.additionalInfo.informantName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Relationship to Deceased</p>
                  <p>{deathRecord.additionalInfo.informantRelationship}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Informant Contact</p>
                  <p>{deathRecord.additionalInfo.informantContact}</p>
                </div>
                {deathRecord.additionalInfo.notes && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Additional Notes</p>
                    <p>{deathRecord.additionalInfo.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Audit History
              </CardTitle>
              <CardDescription>Track all changes made to this death record</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditHistory.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{entry.action}</TableCell>
                      <TableCell>{entry.user}</TableCell>
                      <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{entry.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
