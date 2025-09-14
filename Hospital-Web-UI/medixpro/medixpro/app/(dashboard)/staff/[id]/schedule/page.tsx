import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowLeft, CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Clock, Plus, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function StaffSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const {id} = use(params)

  // In a real application, you would fetch the staff data from an API
  // For this example, we'll use a mock staff member
  const staff = {
    id: id,
    name: "Dr. Sarah Johnson",
    initials: "SJ",
    role: "Cardiologist",
    department: "Medical",
    email: "sarah.j@clinic.com",
    phone: "555-0101",
    status: "Active",
    avatar: "/mystical-forest-spirit.png",
    schedule: {
      monday: "9:00 AM - 5:00 PM",
      tuesday: "9:00 AM - 5:00 PM",
      wednesday: "9:00 AM - 1:00 PM",
      thursday: "9:00 AM - 5:00 PM",
      friday: "9:00 AM - 5:00 PM",
      saturday: "Off",
      sunday: "Off",
    },
  };

  // Mock appointments for the schedule view
  const appointments = [
    {
      id: "APT001",
      patientName: "John Smith",
      patientId: "PT001",
      time: "9:30 AM - 10:00 AM",
      date: "2023-06-12",
      status: "Confirmed",
      type: "Follow-up",
    },
    {
      id: "APT002",
      patientName: "Emily Johnson",
      patientId: "PT045",
      time: "10:15 AM - 11:00 AM",
      date: "2023-06-12",
      status: "Confirmed",
      type: "Consultation",
    },
    {
      id: "APT003",
      patientName: "Michael Brown",
      patientId: "PT023",
      time: "11:30 AM - 12:00 PM",
      date: "2023-06-12",
      status: "Cancelled",
      type: "Check-up",
    },
    {
      id: "APT004",
      patientName: "Sarah Wilson",
      patientId: "PT078",
      time: "1:30 PM - 2:15 PM",
      date: "2023-06-12",
      status: "Confirmed",
      type: "Procedure",
    },
    {
      id: "APT005",
      patientName: "David Lee",
      patientId: "PT056",
      time: "3:00 PM - 3:30 PM",
      date: "2023-06-12",
      status: "Pending",
      type: "New Patient",
    },
    {
      id: "APT006",
      patientName: "Jennifer Martinez",
      patientId: "PT089",
      time: "4:00 PM - 4:45 PM",
      date: "2023-06-12",
      status: "Confirmed",
      type: "Follow-up",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center flex-wrap gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/staff/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Staff Profile</span>
          </Link>
        </Button>
        <h2 className="text-2xl lg:text-3xl font-bold mb-2">Staff Schedule</h2>
      </div>

      <div className="flex flex-col md:flex-row items-start gap-6">
        <Card className="w-full md:w-72 xl:w-80">
          <CardHeader className="flex flex-row items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={staff.avatar || "/user-2.png"} alt={staff.name} />
              <AvatarFallback>{staff.initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{staff.name}</CardTitle>
              <CardDescription>{staff.role}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Regular Hours</h3>
              <div className="space-y-2 text-sm">
                {Object.entries(staff.schedule).map(([day, hours]) => (
                  <div key={day} className="flex justify-between">
                    <span className="capitalize">{day}:</span>
                    <span className="text-muted-foreground">{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Today's Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Appointments:</span>
                  <Badge variant="outline">6</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Confirmed:</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    4
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pending:</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    1
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cancelled:</span>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    1
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle>Appointment Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous Day</span>
                </Button>
                <Button variant="outline" className="whitespace-nowrap">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  June 12, 2023
                </Button>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next Day</span>
                </Button>
              </div>
            </div>
            <CardDescription>View and manage appointments for {staff.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="day" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>

              <TabsContent value="day" className="mt-0 space-y-4">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <h3 className="text-sm font-medium">Monday, June 12, 2023</h3>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Appointment
                  </Button>
                </div>

                <div className="space-y-3">
                  {appointments.map((appointment) => (
                    <Card key={appointment.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex items-start flex-wrap gap-3">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{appointment.time}</span>
                              </div>
                              <Badge variant="outline" className="mt-1 w-fit">
                                {appointment.type}
                              </Badge>
                            </div>

                            <div>
                              <div className="font-medium">{appointment.patientName}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Patient ID: {appointment.patientId}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={appointment.status === "Confirmed" ? "default" : appointment.status === "Pending" ? "outline" : "secondary"} className={appointment.status === "Cancelled" ? "bg-red-50 text-red-700 border-red-200" : ""}>
                              {appointment.status === "Confirmed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                              {appointment.status === "Pending" && <AlertCircle className="mr-1 h-3 w-3" />}
                              {appointment.status === "Cancelled" && <XCircle className="mr-1 h-3 w-3" />}
                              {appointment.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="week" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h3 className="text-sm font-medium">Week of June 12 - June 18, 2023</h3>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Appointment
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="border rounded p-2">
                        <h4 className="text-sm font-medium mb-2">{day}</h4>
                        <div className="space-y-2">
                          {appointments.slice(0, 2).map((appointment) => (
                            <div key={appointment.id} className="text-xs p-1 bg-blue-500/20 rounded">
                              {appointment.time} - {appointment.patientName}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="month" className="mt-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <h3 className="text-sm font-medium">June 2023</h3>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Appointment
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
                    {Array.from({ length: 35 }, (_, i) => i + 1).map((day) => (
                      <div key={day} className="border rounded p-2 h-24 overflow-y-auto">
                        <h4 className="text-sm font-medium mb-2">{day}</h4>
                        {day <= 30 && (
                          <div className="space-y-1">
                            {appointments.slice(0, 1).map((appointment) => (
                              <div key={appointment.id} className="text-xs p-1 bg-blue-500/20 rounded">
                                {appointment.time}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
