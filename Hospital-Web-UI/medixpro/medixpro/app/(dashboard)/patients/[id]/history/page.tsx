import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Download, Filter, Plus, Search } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  // In a real app, you would fetch the patient data based on the ID
  const { id } = use(params);
  const patientId = id;

  // Sample data for medical history
  const diagnoses = [
    {
      id: "d1",
      date: "2023-07-15",
      condition: "Hypertension",
      doctor: "Dr. Sarah Johnson",
      notes: "Blood pressure consistently elevated. Started on Lisinopril 10mg daily.",
      status: "Active",
    },
    {
      id: "d2",
      date: "2023-06-02",
      condition: "Type 2 Diabetes",
      doctor: "Dr. Michael Chen",
      notes: "HbA1c: 7.8%. Started on Metformin 500mg twice daily.",
      status: "Active",
    },
    {
      id: "d3",
      date: "2022-11-20",
      condition: "Seasonal Allergies",
      doctor: "Dr. Lisa Patel",
      notes: "Prescribed Cetirizine 10mg daily during spring and summer months.",
      status: "Recurring",
    },
    {
      id: "d4",
      date: "2021-03-05",
      condition: "Pneumonia",
      doctor: "Dr. James Wilson",
      notes: "Treated with Azithromycin for 5 days. Full recovery.",
      status: "Resolved",
    },
  ];

  const visits = [
    {
      id: "v1",
      date: "2023-07-15",
      type: "Regular Checkup",
      doctor: "Dr. Sarah Johnson",
      department: "Internal Medicine",
      notes: "Routine physical examination. Blood pressure elevated.",
    },
    {
      id: "v2",
      date: "2023-06-02",
      type: "Follow-up",
      doctor: "Dr. Michael Chen",
      department: "Endocrinology",
      notes: "Follow-up for diabetes management. Adjusted medication.",
    },
    {
      id: "v3",
      date: "2023-04-18",
      type: "Emergency",
      doctor: "Dr. Emily Rodriguez",
      department: "Emergency Medicine",
      notes: "Severe migraine. Treated with pain medication and IV fluids.",
    },
    {
      id: "v4",
      date: "2023-02-10",
      type: "Specialist Consultation",
      doctor: "Dr. Robert Kim",
      department: "Cardiology",
      notes: "Cardiovascular assessment. EKG normal.",
    },
  ];

  const procedures = [
    {
      id: "p1",
      date: "2022-09-12",
      procedure: "Colonoscopy",
      doctor: "Dr. Jennifer Lee",
      location: "Gastroenterology Center",
      notes: "Routine screening. No polyps found.",
    },
    {
      id: "p2",
      date: "2021-11-05",
      procedure: "Wisdom Teeth Extraction",
      doctor: "Dr. David Brown",
      location: "Dental Surgery Center",
      notes: "All four wisdom teeth removed under general anesthesia.",
    },
    {
      id: "p3",
      date: "2020-06-20",
      procedure: "Knee Arthroscopy",
      doctor: "Dr. Thomas Garcia",
      location: "Orthopedic Surgery Center",
      notes: "Meniscus repair. Successful procedure with good recovery.",
    },
  ];

  const immunizations = [
    {
      id: "i1",
      date: "2023-10-05",
      vaccine: "Influenza (Flu)",
      administrator: "Nurse Wilson",
      location: "City Clinic",
      notes: "Annual flu shot.",
    },
    {
      id: "i2",
      date: "2022-03-15",
      vaccine: "Tdap (Tetanus, Diphtheria, Pertussis)",
      administrator: "Dr. Sarah Johnson",
      location: "Main Hospital",
      notes: "10-year booster.",
    },
    {
      id: "i3",
      date: "2021-08-22",
      vaccine: "COVID-19 (Pfizer)",
      administrator: "Pharmacist Rodriguez",
      location: "Community Pharmacy",
      notes: "Second dose of primary series.",
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
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Medical History</h1>
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
                  <span className="text-muted-foreground">Blood Type:</span>
                  <span>A+</span>
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
                  <Link href={`/patients/${patientId}/prescriptions`}>View Prescriptions</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-3/4">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Medical Timeline</CardTitle>
                <CardDescription>Chronological view of patient's medical events</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Calendar className="mr-2 h-4 w-4" />
                  All Time
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted pl-6 pb-2">
                {[...diagnoses, ...visits, ...procedures, ...immunizations]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((event, index) => (
                    <div key={index} className="mb-8 relative">
                      <div className="absolute -left-10 mt-1.5 h-4 w-4 rounded-full bg-primary"></div>
                      <time className="mb-1 text-sm font-normal leading-none text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                      <h3 className="text-lg font-semibold">{"condition" in event ? event.condition : "type" in event ? event.type : "procedure" in event ? event.procedure : "vaccine" in event ? event.vaccine : ""}</h3>
                      <p className="text-sm text-muted-foreground mb-1">{"doctor" in event ? `Dr. ${event.doctor}` : "administrator" in event ? event.administrator : ""}</p>
                      <p className="text-sm">{"notes" in event ? event.notes : ""}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="diagnoses">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
                <TabsTrigger value="visits">Visits</TabsTrigger>
                <TabsTrigger value="procedures">Procedures</TabsTrigger>
                <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search..." className="pl-8 w-[200px]" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New
                </Button>
              </div>
            </div>

            <TabsContent value="diagnoses">
              <Card>
                <CardHeader>
                  <CardTitle>Diagnoses & Conditions</CardTitle>
                  <CardDescription>Medical conditions diagnosed by healthcare providers</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {diagnoses.map((diagnosis) => (
                        <TableRow key={diagnosis.id}>
                          <TableCell>{diagnosis.date}</TableCell>
                          <TableCell className="font-medium">{diagnosis.condition}</TableCell>
                          <TableCell>{diagnosis.doctor}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={diagnosis.status === "Active" ? "border-green-500 text-green-500" : diagnosis.status === "Resolved" ? "border-blue-500 text-blue-500" : "border-yellow-500 text-yellow-500"}>
                              {diagnosis.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{diagnosis.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="visits">
              <Card>
                <CardHeader>
                  <CardTitle>Clinic Visits</CardTitle>
                  <CardDescription>Record of all patient visits to the clinic</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Visit Type</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {visits.map((visit) => (
                        <TableRow key={visit.id}>
                          <TableCell>{visit.date}</TableCell>
                          <TableCell className="font-medium">{visit.type}</TableCell>
                          <TableCell>{visit.doctor}</TableCell>
                          <TableCell>{visit.department}</TableCell>
                          <TableCell className="max-w-xs truncate">{visit.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="procedures">
              <Card>
                <CardHeader>
                  <CardTitle>Procedures & Surgeries</CardTitle>
                  <CardDescription>Medical procedures performed on the patient</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Procedure</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {procedures.map((procedure) => (
                        <TableRow key={procedure.id}>
                          <TableCell>{procedure.date}</TableCell>
                          <TableCell className="font-medium">{procedure.procedure}</TableCell>
                          <TableCell>{procedure.doctor}</TableCell>
                          <TableCell>{procedure.location}</TableCell>
                          <TableCell className="max-w-xs truncate">{procedure.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="immunizations">
              <Card>
                <CardHeader>
                  <CardTitle>Immunizations & Vaccines</CardTitle>
                  <CardDescription>Record of all vaccines administered to the patient</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Vaccine</TableHead>
                        <TableHead>Administrator</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {immunizations.map((immunization) => (
                        <TableRow key={immunization.id}>
                          <TableCell>{immunization.date}</TableCell>
                          <TableCell className="font-medium">{immunization.vaccine}</TableCell>
                          <TableCell>{immunization.administrator}</TableCell>
                          <TableCell>{immunization.location}</TableCell>
                          <TableCell className="max-w-xs truncate">{immunization.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
