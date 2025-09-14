import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar, Download, FileText, Plus, Printer, Search } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function PatientPrescriptionsPage({ params }: { params: Promise<{ id: string }> }) {
  // In a real app, you would fetch the patient data based on the ID
  const { id } = use(params);
  const patientId = id;

  // Sample data for prescriptions
  const prescriptions = [
    {
      id: "p1",
      date: "2023-07-15",
      medication: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "3 months",
      doctor: "Dr. Sarah Johnson",
      status: "Active",
      refills: 2,
    },
    {
      id: "p2",
      date: "2023-07-15",
      medication: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      duration: "3 months",
      doctor: "Dr. Michael Chen",
      status: "Active",
      refills: 2,
    },
    {
      id: "p3",
      date: "2023-05-10",
      medication: "Atorvastatin",
      dosage: "20mg",
      frequency: "Once daily at bedtime",
      duration: "6 months",
      doctor: "Dr. Sarah Johnson",
      status: "Active",
      refills: 5,
    },
    {
      id: "p4",
      date: "2023-04-22",
      medication: "Amoxicillin",
      dosage: "500mg",
      frequency: "Three times daily",
      duration: "10 days",
      doctor: "Dr. Lisa Patel",
      status: "Completed",
      refills: 0,
    },
    {
      id: "p5",
      date: "2023-02-15",
      medication: "Prednisone",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "5 days",
      doctor: "Dr. James Wilson",
      status: "Completed",
      refills: 0,
    },
    {
      id: "p6",
      date: "2022-11-30",
      medication: "Cetirizine",
      dosage: "10mg",
      frequency: "Once daily",
      duration: "As needed",
      doctor: "Dr. Lisa Patel",
      status: "Active",
      refills: 3,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/patients">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Prescriptions</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/user-3.png" alt="Patient" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold">John Smith</h3>
                <p className="text-sm text-muted-foreground">45 years • Male</p>
                <div className="flex justify-center mt-2">
                  <Badge className="bg-green-500">Active Patient</Badge>
                </div>
              </div>

              <div className="w-full space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Patient ID:</span>
                  <span>{patientId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Allergies:</span>
                  <span>Penicillin, Peanuts</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Primary Doctor:</span>
                  <span>Dr. Sarah Johnson</span>
                </div>
              </div>

              <div className="w-full pt-2 flex flex-col gap-2">
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/patients/${patientId}`}>View Profile</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/patients/${patientId}/edit`}>Edit Details</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/patients/${patientId}/history`}>Medical History</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Prescription Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Active Prescriptions</span>
                  <span className="text-2xl font-bold">4</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-2xl font-bold">2</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Refills Available</span>
                  <span className="text-2xl font-bold">12</span>
                </div>
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-3/4">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>Prescriptions List</CardTitle>
                <CardDescription>Manage patient's medication prescriptions</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search prescriptions..." className="pl-8 w-full md:w-[250px]" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Prescription
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Medication</TableHead>
                    <TableHead className="hidden md:table-cell">Dosage</TableHead>
                    <TableHead className="hidden md:table-cell">Frequency</TableHead>
                    <TableHead className="hidden md:table-cell">Doctor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Refills</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {prescriptions.map((prescription) => (
                    <TableRow key={prescription.id}>
                      <TableCell>{prescription.date}</TableCell>
                      <TableCell className="font-medium">{prescription.medication}</TableCell>
                      <TableCell className="hidden md:table-cell">{prescription.dosage}</TableCell>
                      <TableCell className="hidden md:table-cell">{prescription.frequency}</TableCell>
                      <TableCell className="hidden md:table-cell">{prescription.doctor}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={prescription.status === "Active" ? "border-green-500 text-green-500" : "border-blue-500 text-blue-500"}>
                          {prescription.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{prescription.refills}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="mr-2 h-4 w-4" />
                              Print Prescription
                            </DropdownMenuItem>
                            <DropdownMenuItem>Request Refill</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Edit Prescription</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">Discontinue</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mt-6">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Prescription History
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Medication Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
