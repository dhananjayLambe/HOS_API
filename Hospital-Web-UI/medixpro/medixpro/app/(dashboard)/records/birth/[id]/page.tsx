"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Edit, FileText } from "lucide-react";
import BirthCertificate from "@/components/birth-certificate";

// Sample data for a birth record
const birthRecord = {
  id: "BR-2023-001",
  childName: "Emma Johnson",
  childFirstName: "Emma",
  childMiddleName: "",
  childLastName: "Johnson",
  gender: "Female",
  dateOfBirth: "2023-05-15T08:30:00",
  timeOfBirth: "08:30",
  placeOfBirth: "City General Hospital",
  weight: "3.2 kg",
  length: "50 cm",

  motherName: "Sarah Johnson",
  motherFirstName: "Sarah",
  motherMiddleName: "",
  motherLastName: "Johnson",
  motherDateOfBirth: "1988-03-12",
  motherNationality: "American",
  motherOccupation: "Software Engineer",

  fatherName: "Michael Johnson",
  fatherFirstName: "Michael",
  fatherMiddleName: "",
  fatherLastName: "Johnson",
  fatherDateOfBirth: "1986-07-22",
  fatherNationality: "American",
  fatherOccupation: "Architect",

  attendingDoctor: "Dr. Lisa Chen",
  hospital: "City General Hospital",
  remarks: "Normal delivery without complications.",
  status: "Verified",
  registrationDate: "2023-05-17T10:15:00",
  registeredBy: "Admin User",
  certificateNumber: "BC-2023-0542",

  // Audit trail
  auditTrail: [
    {
      action: "Record Created",
      timestamp: "2023-05-17T10:15:00",
      user: "Admin User",
      details: "Initial record creation",
    },
    {
      action: "Record Verified",
      timestamp: "2023-05-18T14:30:00",
      user: "Dr. Lisa Chen",
      details: "Medical information verified",
    },
    {
      action: "Certificate Generated",
      timestamp: "2023-05-19T09:45:00",
      user: "Admin User",
      details: "Birth certificate generated",
    },
  ],
};

export default function BirthRecordDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter();
  const [showCertificate, setShowCertificate] = useState(false);

  const record = birthRecord; // Using sample data for demonstration

  return (
    <div className="container mx-auto space-y-6">
      {showCertificate ? (
        <BirthCertificate record={record} setShowCertificate={setShowCertificate} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl lg:text-2xl  font-bold tracking-tight">Birth Record Details</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={() => router.push(`/records/birth/${id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Record
              </Button>
              <Button onClick={() => setShowCertificate(true)}>
                <FileText className="mr-2 h-4 w-4" />
                View Certificate
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-muted-foreground">Record ID: {record.id}</p>
              <p className="text-muted-foreground">Certificate Number: {record.certificateNumber}</p>
            </div>
            <Badge variant={record.status === "Verified" ? "default" : "outline"} className={record.status === "Verified" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}>
              {record.status}
            </Badge>
          </div>

          <Tabs defaultValue="details">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Record Details</TabsTrigger>
              <TabsTrigger value="history">Audit History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Child Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p>{record.childName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Gender</p>
                    <p>{record.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p>{new Date(record.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time of Birth</p>
                    <p>{record.timeOfBirth}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Place of Birth</p>
                    <p>{record.placeOfBirth}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Weight</p>
                    <p>{record.weight}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Length</p>
                    <p>{record.length}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Mother's Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p>{record.motherName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                      <p>{new Date(record.motherDateOfBirth).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                      <p>{record.motherNationality}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                      <p>{record.motherOccupation || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Father's Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p>{record.fatherName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                      <p>{new Date(record.fatherDateOfBirth).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nationality</p>
                      <p>{record.fatherNationality}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                      <p>{record.fatherOccupation || "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Medical Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attending Doctor</p>
                    <p>{record.attendingDoctor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Hospital/Facility</p>
                    <p>{record.hospital}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Remarks</p>
                    <p>{record.remarks || "No additional remarks"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Registration Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
                    <p>{new Date(record.registrationDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Registered By</p>
                    <p>{record.registeredBy}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Audit History</CardTitle>
                  <CardDescription>Record of all changes and actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {record.auditTrail.map((entry, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-medium">{entry.action}</div>
                          <div className="text-sm text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="text-sm">By: {entry.user}</div>
                        <div className="text-sm text-muted-foreground">{entry.details}</div>
                        {index < record.auditTrail.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
