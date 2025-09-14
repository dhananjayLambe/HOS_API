import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft, Building, Calendar, CalendarClock, CheckCircle2, Clock, FileText, MapPin, Pencil, Stethoscope, User, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";

// This would normally come from a database
const getAppointment = (id: string) => {
  return {
    id: "1",
    patient: {
      id: "p1",
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      email: "john.smith@example.com",
      phone: "+1 (555) 123-4567",
      dateOfBirth: "1985-06-15",
      address: "123 Main St, Anytown, CA 94538",
    },
    doctor: {
      id: "d1",
      name: "Dr. Sarah Johnson",
      image: "/user-3.png",
      specialization: "General Medicine",
      email: "sarah.johnson@clinic.com",
      phone: "+1 (555) 987-6543",
    },
    date: "2023-07-15",
    time: "10:00 AM",
    endTime: "10:30 AM",
    status: "Confirmed",
    type: "Check-up",
    duration: "30 min",
    department: "General Medicine",
    room: "Room 103",
    notes: "Regular annual check-up. Patient has reported mild seasonal allergies.",
    createdAt: "2023-06-30T14:23:45Z",
    updatedAt: "2023-07-01T09:12:30Z",
    reasonForVisit: "Annual physical examination",
    vitalSigns: {
      bloodPressure: "120/80 mmHg",
      heartRate: "72 bpm",
      temperature: "98.6°F",
      respiratoryRate: "16 breaths/min",
      oxygenSaturation: "98%",
      height: "5'10\"",
      weight: "170 lbs",
    },
  };
};

export default function AppointmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const appointment = getAppointment(id);

  if (!appointment) {
    notFound();
  }

  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Confirmed":
        return <AlertCircle className="shrink-0 h-5 w-5 text-blue-500" />;
      case "In Progress":
        return <Clock className="shrink-0 h-5 w-5 text-amber-500" />;
      case "Completed":
        return <CheckCircle2 className="shrink-0 h-5 w-5 text-green-500" />;
      case "Cancelled":
        return <XCircle className="shrink-0 h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Confirmed":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            Confirmed
          </Badge>
        );
      case "In Progress":
        return <Badge className="bg-amber-500">In Progress</Badge>;
      case "Completed":
        return <Badge className="bg-green-500">Completed</Badge>;
      case "Cancelled":
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" asChild>
            <Link href="/appointments">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to appointments</span>
            </Link>
          </Button>
          <h2 className="text-3xl font-bold leading-tight mb-2">Appointment Details</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {appointment.status !== "Cancelled" && appointment.status !== "Completed" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/appointments/${appointment.id}/reschedule`}>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Reschedule
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/appointments/${appointment.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Appointment
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main appointment info */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {getStatusIcon(appointment.status)}
                {appointment.type}
              </CardTitle>
              <CardDescription>
                Appointment #{appointment.id} • Created on {new Date(appointment.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            {getStatusBadge(appointment.status)}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date and time */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="shrink-0 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Date</h3>
                    <p>
                      {new Date(appointment.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="shrink-0 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Time</h3>
                    <p>
                      {appointment.time} - {appointment.endTime} ({appointment.duration})
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="shrink-0 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Department</h3>
                    <p>{appointment.department}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="shrink-0 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Location</h3>
                    <p>{appointment.room}</p>
                  </div>
                </div>
              </div>

              {/* Reason and notes */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="shrink-0 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Reason for Visit</h3>
                    <p>{appointment.reasonForVisit}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="shrink-0 h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Notes</h3>
                    <p className="text-sm">{appointment.notes}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Vital signs if available */}
            {appointment.vitalSigns && (
              <>
                <div>
                  <h3 className="font-semibold mb-3">Vital Signs</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Blood Pressure</p>
                      <p className="font-medium">{appointment.vitalSigns.bloodPressure}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Heart Rate</p>
                      <p className="font-medium">{appointment.vitalSigns.heartRate}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Temperature</p>
                      <p className="font-medium">{appointment.vitalSigns.temperature}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Respiratory Rate</p>
                      <p className="font-medium">{appointment.vitalSigns.respiratoryRate}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Oxygen Saturation</p>
                      <p className="font-medium">{appointment.vitalSigns.oxygenSaturation}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Height</p>
                      <p className="font-medium">{appointment.vitalSigns.height}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">Weight</p>
                      <p className="font-medium">{appointment.vitalSigns.weight}</p>
                    </div>
                  </div>
                </div>
                <Separator />
              </>
            )}
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">Last updated: {new Date(appointment.updatedAt).toLocaleString()}</CardFooter>
        </Card>

        {/* Patient and doctor info */}
        <div className="space-y-6">
          {/* Patient info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={appointment.patient.image || "/user-2.png"} alt={appointment.patient.name} />
                  <AvatarFallback>{appointment.patient.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{appointment.patient.name}</h3>
                  <p className="text-sm text-muted-foreground">DOB: {new Date(appointment.patient.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="grid grid-cols-[20px_1fr] gap-2 items-start">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm">{appointment.patient.address}</p>
                </div>
                <div className="grid grid-cols-[20px_1fr] gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <p className="text-sm">{appointment.patient.phone}</p>
                </div>
                <div className="grid grid-cols-[20px_1fr] gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <p className="text-sm">{appointment.patient.email}</p>
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/patients/${appointment.patient.id}`}>View Patient Record</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Doctor info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Doctor Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={appointment.doctor.image || "/user-2.png"} alt={appointment.doctor.name} />
                  <AvatarFallback>{appointment.doctor.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{appointment.doctor.name}</h3>
                  <p className="text-sm text-muted-foreground">{appointment.doctor.specialization}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="grid grid-cols-[20px_1fr] gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <p className="text-sm">{appointment.doctor.phone}</p>
                </div>
                <div className="grid grid-cols-[20px_1fr] gap-2 items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <p className="text-sm">{appointment.doctor.email}</p>
                </div>
              </div>
              <div className="pt-2">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/doctors/${appointment.doctor.id}`}>View Doctor Profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
