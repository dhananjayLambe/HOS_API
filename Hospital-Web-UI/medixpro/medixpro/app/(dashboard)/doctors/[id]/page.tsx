import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, ChevronLeft, Clock, Filter, Mail, MapPin, Phone, Plus, Search, Star, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";

// Mock data for a single doctor
const getDoctorById = (id: string) => {
  return {
    id: "1",
    name: "Dr. Sarah Johnson",
    image: "/colorful-abstract-shapes.png",
    specialty: "Cardiology",
    status: "Active",
    patients: 120,
    experience: "8 years",
    email: "sarah.johnson@medixpro.com",
    phone: "+1 (555) 123-4567",
    address: "123 Medical Center Blvd, Suite 456, New York, NY 10001",
    bio: "Dr. Sarah Johnson is a board-certified cardiologist with over 8 years of experience in diagnosing and treating heart conditions. She specializes in preventive cardiology and heart failure management.",
    education: [
      { degree: "MD", institution: "Harvard Medical School", year: "2012" },
      { degree: "Residency in Internal Medicine", institution: "Massachusetts General Hospital", year: "2015" },
      { degree: "Fellowship in Cardiology", institution: "Johns Hopkins Hospital", year: "2018" },
    ],
    certifications: [
      { name: "Board Certification in Cardiology", issuer: "American Board of Internal Medicine", year: "2018" },
      { name: "Advanced Cardiac Life Support (ACLS)", issuer: "American Heart Association", year: "2022" },
    ],
    languages: ["English", "Spanish"],
    rating: 4.8,
    reviewCount: 87,
    appointments: [
      {
        id: "a1",
        patientName: "John Smith",
        date: "2023-04-22",
        time: "09:00 AM",
        status: "Completed",
        type: "Check-up",
      },
      {
        id: "a2",
        patientName: "Emily Davis",
        date: "2023-04-22",
        time: "10:30 AM",
        status: "Completed",
        type: "Consultation",
      },
      {
        id: "a3",
        patientName: "Michael Brown",
        date: "2023-04-22",
        time: "01:00 PM",
        status: "Scheduled",
        type: "Follow-up",
      },
      {
        id: "a4",
        patientName: "Jessica Wilson",
        date: "2023-04-22",
        time: "03:30 PM",
        status: "Scheduled",
        type: "New Patient",
      },
    ],
    schedule: {
      monday: { start: "09:00 AM", end: "05:00 PM" },
      tuesday: { start: "09:00 AM", end: "05:00 PM" },
      wednesday: { start: "09:00 AM", end: "05:00 PM" },
      thursday: { start: "09:00 AM", end: "05:00 PM" },
      friday: { start: "09:00 AM", end: "03:00 PM" },
      saturday: { start: "10:00 AM", end: "01:00 PM" },
      sunday: { start: "", end: "" },
    },
    performance: {
      patientSatisfaction: 92,
      appointmentCompletion: 98,
      recordCompletionRate: 95,
      averageWaitTime: "12 minutes",
      averageConsultationTime: "25 minutes",
    },
    recentPatients: [
      { id: "p1", name: "John Smith", lastVisit: "2023-04-15", condition: "Hypertension" },
      { id: "p2", name: "Emily Davis", lastVisit: "2023-04-10", condition: "Arrhythmia" },
      { id: "p3", name: "Michael Brown", lastVisit: "2023-04-05", condition: "Coronary Artery Disease" },
      { id: "p4", name: "Jessica Wilson", lastVisit: "2023-03-28", condition: "Heart Failure" },
      { id: "p5", name: "David Martinez", lastVisit: "2023-03-20", condition: "Valve Disease" },
    ],
  };
};

export default function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const doctor = getDoctorById(id);

  if (!doctor) {
    notFound();
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "On Leave":
        return "border-amber-500 text-amber-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "On Leave":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-500";
      case "Scheduled":
        return "text-blue-500";
      case "Cancelled":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/doctors">
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back to doctors</span>
          </Link>
        </Button>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Doctor Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={doctor.image || "/user-2.png"} alt={doctor.name} />
              <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle>{doctor.name}</CardTitle>
            <CardDescription>{doctor.specialty}</CardDescription>
            <div className="mt-2">
              <Badge variant={getStatusVariant(doctor.status)} className={getStatusColor(doctor.status)}>
                {doctor.status}
              </Badge>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="ml-1 font-medium">{doctor.rating}</span>
              </div>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-muted-foreground">{doctor.reviewCount} reviews</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start">
                <Mail className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-1">Email</p>
                  <p className="text-sm text-muted-foreground">{doctor.email}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-1">Phone</p>
                  <p className="text-sm text-muted-foreground">{doctor.phone}</p>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-1">Address</p>
                  <p className="text-sm text-muted-foreground">{doctor.address}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Users className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-1">Patients</p>
                  <p className="text-sm text-muted-foreground">{doctor.patients} active patients</p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-4 w-4 mr-2 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium mb-1">Experience</p>
                  <p className="text-sm text-muted-foreground">{doctor.experience}</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Languages</h4>
              <div className="flex flex-wrap gap-2">
                {doctor.languages.map((language) => (
                  <Badge key={language} variant="outline">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-4">Weekly Schedule</h4>
              <div className="space-y-3 text-sm">
                {Object.entries(doctor.schedule).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}:</span>
                    <span>{hours.start && hours.end ? `${hours.start} - ${hours.end}` : hours.start ? hours.start : "Closed"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline">Message</Button>
              <Button>Schedule</Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="patients">Patients</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{doctor.bio}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Education & Certifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Education</h4>
                    <div className="space-y-3">
                      {doctor.education.map((edu, index) => (
                        <div key={index} className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium mb-1">{edu.degree}</p>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium mb-2">Certifications</h4>
                    <div className="space-y-3">
                      {doctor.certifications.map((cert: any, index) => (
                        <div key={index} className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium mb-1">{cert.name || cert.degree}</p>
                            <p className="text-sm text-muted-foreground">{cert.issuer || cert.institution}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{cert.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Today's Schedule</CardTitle>
                  <Button variant="outline" size="sm">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {doctor.appointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{appointment.time}</span>
                            <span className="text-xs text-muted-foreground">{appointment.type}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium">{appointment.patientName}</span>
                          <span className={`text-xs ${getAppointmentStatusColor(appointment.status)}`}>{appointment.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appointments Tab */}
            <TabsContent value="appointments" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Appointment History</CardTitle>
                    <CardDescription>View and manage all appointments</CardDescription>
                  </div>
                  <Button size="sm" href="/appointments/add">
                    <Plus className="h-4 w-4 mr-2" />
                    New Appointment
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {doctor.appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">{appointment.patientName}</TableCell>
                          <TableCell>{appointment.date}</TableCell>
                          <TableCell>{appointment.time}</TableCell>
                          <TableCell>{appointment.type}</TableCell>
                          <TableCell>
                            <span className={getAppointmentStatusColor(appointment.status)}>{appointment.status}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patients Tab */}
            <TabsContent value="patients" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Patient List</CardTitle>
                    <CardDescription>Manage assigned patients</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Search patients..." className="pl-8 w-[200px]" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {doctor.recentPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>{patient.condition}</TableCell>
                          <TableCell>{patient.lastVisit}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" href="/patients/1" asChild>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Patient Satisfaction</span>
                        <span className="text-sm font-medium">{doctor.performance.patientSatisfaction}%</span>
                      </div>
                      <Progress value={doctor.performance.patientSatisfaction} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Appointment Completion</span>
                        <span className="text-sm font-medium">{doctor.performance.appointmentCompletion}%</span>
                      </div>
                      <Progress value={doctor.performance.appointmentCompletion} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Record Completion Rate</span>
                        <span className="text-sm font-medium">{doctor.performance.recordCompletionRate}%</span>
                      </div>
                      <Progress value={doctor.performance.recordCompletionRate} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Time Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b">
                      <div>
                        <p className="text-sm font-medium mb-1">Average Wait Time</p>
                        <p className="text-sm text-muted-foreground">Time patients wait before being seen</p>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {doctor.performance.averageWaitTime}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium mb-1">Average Consultation Time</p>
                        <p className="text-sm text-muted-foreground">Time spent with each patient</p>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {doctor.performance.averageConsultationTime}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
