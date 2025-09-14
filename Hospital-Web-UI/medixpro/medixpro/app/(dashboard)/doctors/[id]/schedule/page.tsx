"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ChevronLeft, Clock, MoreHorizontal, Plus, Users } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

// Sample doctor data
const doctor = {
  id: "1",
  name: "Dr. Sarah Johnson",
  image: "/colorful-abstract-shapes.png",
  specialty: "Cardiology",
  status: "Active",
  department: "Cardiology",
};

// Sample schedule data
const weeklySchedule = [
  { day: "Monday", startTime: "09:00", endTime: "17:00", status: "Available" },
  { day: "Tuesday", startTime: "09:00", endTime: "17:00", status: "Available" },
  { day: "Wednesday", startTime: "09:00", endTime: "13:00", status: "Available" },
  { day: "Thursday", startTime: "09:00", endTime: "17:00", status: "Available" },
  { day: "Friday", startTime: "09:00", endTime: "15:00", status: "Available" },
  { day: "Saturday", startTime: "", endTime: "", status: "Unavailable" },
  { day: "Sunday", startTime: "", endTime: "", status: "Unavailable" },
];

// Sample appointments data
const appointments = [
  {
    id: "1",
    patientName: "John Smith",
    patientImage: "/user-3.png",
    date: "2023-05-15",
    day: "Monday",
    time: "10:00 AM",
    duration: "30 min",
    type: "Check-up",
    status: "Confirmed",
  },
  {
    id: "2",
    patientName: "Emily Davis",
    patientImage: "/user-3.png",
    date: "2023-05-15",
    day: "Monday",
    time: "11:30 AM",
    duration: "45 min",
    type: "Consultation",
    status: "Confirmed",
  },
  {
    id: "3",
    patientName: "Michael Johnson",
    patientImage: "/user-3.png",
    date: "2023-05-15",
    day: "Monday",
    time: "2:00 PM",
    duration: "30 min",
    type: "Follow-up",
    status: "Confirmed",
  },
  {
    id: "4",
    patientName: "Sarah Williams",
    patientImage: "/user-3.png",
    date: "2023-05-16",
    day: "Tuesday",
    time: "9:30 AM",
    duration: "30 min",
    type: "Check-up",
    status: "Confirmed",
  },
  {
    id: "5",
    patientName: "Robert Brown",
    patientImage: "/user-3.png",
    date: "2023-05-16",
    day: "Tuesday",
    time: "11:00 AM",
    duration: "60 min",
    type: "New Patient",
    status: "Confirmed",
  },
];

// Sample time slots
const timeSlots = ["09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"];

// Sample time off requests
const timeOffRequests = [
  {
    id: "1",
    startDate: "2023-05-22",
    endDate: "2023-05-26",
    reason: "Annual Leave",
    status: "Approved",
  },
  {
    id: "2",
    startDate: "2023-06-15",
    endDate: "2023-06-15",
    reason: "Medical Conference",
    status: "Pending",
  },
];

export default function DoctorSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const [selectedDate, setSelectedDate] = useState<string>("2023-05-15");
  const [isAddingTimeSlot, setIsAddingTimeSlot] = useState(false);

  // Filter appointments for the selected date
  const filteredAppointments = appointments.filter((appointment) => appointment.date === selectedDate);
  const { id } = use(params);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/doctors/${id}`}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Doctor Schedule</h1>
          <p className="text-muted-foreground">Manage schedule and appointments for {doctor.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Doctor Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={doctor.image || "/user-2.png"} alt={doctor.name} />
                <AvatarFallback>{doctor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{doctor.name}</CardTitle>
                <CardDescription>{doctor.specialty}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Weekly Schedule</h3>
                <div className="space-y-2">
                  {weeklySchedule.map((schedule) => (
                    <div key={schedule.day} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{schedule.day}</span>
                      {schedule.status === "Available" ? (
                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Time Off</h3>
                <div className="space-y-2">
                  {timeOffRequests.map((request) => (
                    <div key={request.id} className="text-sm border rounded-md p-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{request.reason}</span>
                        <Badge variant={request.status === "Approved" ? "default" : "outline"} className={request.status === "Approved" ? "bg-green-500" : "border-amber-500 text-amber-500"}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">{request.startDate === request.endDate ? request.startDate : `${request.startDate} - ${request.endDate}`}</div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Request Time Off
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Content */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Manage doctor's appointments and schedule</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select defaultValue={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023-05-15">May 15, 2023 (Mon)</SelectItem>
                    <SelectItem value="2023-05-16">May 16, 2023 (Tue)</SelectItem>
                    <SelectItem value="2023-05-17">May 17, 2023 (Wed)</SelectItem>
                    <SelectItem value="2023-05-18">May 18, 2023 (Thu)</SelectItem>
                    <SelectItem value="2023-05-19">May 19, 2023 (Fri)</SelectItem>
                  </SelectContent>
                </Select>
                <Dialog open={isAddingTimeSlot} onOpenChange={setIsAddingTimeSlot}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Slot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Appointment Slot</DialogTitle>
                      <DialogDescription>Create a new appointment slot for patients to book.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                          Date
                        </Label>
                        <Input id="date" type="date" defaultValue={selectedDate} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="start-time" className="text-right">
                          Start Time
                        </Label>
                        <Select defaultValue="09:00 AM">
                          <SelectTrigger id="start-time" className="col-span-3">
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                          Duration
                        </Label>
                        <Select defaultValue="30">
                          <SelectTrigger id="duration" className="col-span-3">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">60 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="repeat" className="text-right">
                          Repeat
                        </Label>
                        <Select defaultValue="none">
                          <SelectTrigger id="repeat" className="col-span-3">
                            <SelectValue placeholder="Select repeat option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Do not repeat</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddingTimeSlot(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setIsAddingTimeSlot(false)}>Add Slot</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="list">
                    <Users className="h-4 w-4 mr-2" />
                    List View
                  </TabsTrigger>
                  <TabsTrigger value="day">
                    <Clock className="h-4 w-4 mr-2" />
                    Day View
                  </TabsTrigger>
                  <TabsTrigger value="calendar">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list">
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {filteredAppointments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No appointments scheduled for this date.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <TableRow key={appointment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={appointment.patientImage || "/user-2.png"} alt={appointment.patientName} />
                                  <AvatarFallback>{appointment.patientName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{appointment.patientName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{appointment.time}</TableCell>
                            <TableCell>{appointment.duration}</TableCell>
                            <TableCell>{appointment.type}</TableCell>
                            <TableCell>
                              <Badge variant={appointment.status === "Confirmed" ? "default" : "outline"} className={appointment.status === "Confirmed" ? "bg-green-500" : ""}>
                                {appointment.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>View details</DropdownMenuItem>
                                  <DropdownMenuItem>Reschedule</DropdownMenuItem>
                                  <DropdownMenuItem>Cancel appointment</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="day">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Morning</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {filteredAppointments
                              .filter((a) => a.time.includes("AM"))
                              .map((appointment) => (
                                <div key={appointment.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-3">
                                    <div className="font-medium">{appointment.time}</div>
                                    <div>
                                      <div className="font-medium">{appointment.patientName}</div>
                                      <div className="text-sm text-muted-foreground">{appointment.type}</div>
                                    </div>
                                  </div>
                                  <Badge variant={appointment.status === "Confirmed" ? "default" : "outline"} className={appointment.status === "Confirmed" ? "bg-green-500" : ""}>
                                    {appointment.status}
                                  </Badge>
                                </div>
                              ))}
                            {filteredAppointments.filter((a) => a.time.includes("AM")).length === 0 && <div className="text-center py-4 text-muted-foreground">No morning appointments scheduled.</div>}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Afternoon</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {filteredAppointments
                              .filter((a) => a.time.includes("PM"))
                              .map((appointment) => (
                                <div key={appointment.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div className="flex items-center gap-3">
                                    <div className="font-medium">{appointment.time}</div>
                                    <div>
                                      <div className="font-medium">{appointment.patientName}</div>
                                      <div className="text-sm text-muted-foreground">{appointment.type}</div>
                                    </div>
                                  </div>
                                  <Badge variant={appointment.status === "Confirmed" ? "default" : "outline"} className={appointment.status === "Confirmed" ? "bg-green-500" : ""}>
                                    {appointment.status}
                                  </Badge>
                                </div>
                              ))}
                            {filteredAppointments.filter((a) => a.time.includes("PM")).length === 0 && <div className="text-center py-4 text-muted-foreground">No afternoon appointments scheduled.</div>}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="calendar">
                  <div className="border rounded-md p-4">
                    <div className="text-center mb-4">
                      <h3 className="font-medium">May 2023</h3>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                      <div className="text-sm font-medium">Sun</div>
                      <div className="text-sm font-medium">Mon</div>
                      <div className="text-sm font-medium">Tue</div>
                      <div className="text-sm font-medium">Wed</div>
                      <div className="text-sm font-medium">Thu</div>
                      <div className="text-sm font-medium">Fri</div>
                      <div className="text-sm font-medium">Sat</div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {/* Calendar days would be generated here */}
                      <div className="h-16 p-1 border rounded-md text-muted-foreground">30</div>
                      <div className="h-16 p-1 border rounded-md">1</div>
                      <div className="h-16 p-1 border rounded-md">2</div>
                      <div className="h-16 p-1 border rounded-md">3</div>
                      <div className="h-16 p-1 border rounded-md">4</div>
                      <div className="h-16 p-1 border rounded-md">5</div>
                      <div className="h-16 p-1 border rounded-md">6</div>

                      <div className="h-16 p-1 border rounded-md">7</div>
                      <div className="h-16 p-1 border rounded-md">8</div>
                      <div className="h-16 p-1 border rounded-md">9</div>
                      <div className="h-16 p-1 border rounded-md">10</div>
                      <div className="h-16 p-1 border rounded-md">11</div>
                      <div className="h-16 p-1 border rounded-md">12</div>
                      <div className="h-16 p-1 border rounded-md">13</div>

                      <div className="h-16 p-1 border rounded-md">14</div>
                      <div className="h-16 p-1 border rounded-md bg-primary/10 relative">
                        15
                        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-primary ml-0.5"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-primary ml-0.5"></div>
                        </div>
                      </div>
                      <div className="h-16 p-1 border rounded-md relative">
                        16
                        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-primary ml-0.5"></div>
                        </div>
                      </div>
                      <div className="h-16 p-1 border rounded-md">17</div>
                      <div className="h-16 p-1 border rounded-md">18</div>
                      <div className="h-16 p-1 border rounded-md">19</div>
                      <div className="h-16 p-1 border rounded-md">20</div>

                      <div className="h-16 p-1 border rounded-md">21</div>
                      <div className="h-16 p-1 border rounded-md bg-red-100/10">22</div>
                      <div className="h-16 p-1 border rounded-md bg-red-100/10">23</div>
                      <div className="h-16 p-1 border rounded-md bg-red-100/10">24</div>
                      <div className="h-16 p-1 border rounded-md bg-red-100/10">25</div>
                      <div className="h-16 p-1 border rounded-md bg-red-100/10">26</div>
                      <div className="h-16 p-1 border rounded-md">27</div>

                      <div className="h-16 p-1 border rounded-md">28</div>
                      <div className="h-16 p-1 border rounded-md">29</div>
                      <div className="h-16 p-1 border rounded-md">30</div>
                      <div className="h-16 p-1 border rounded-md">31</div>
                      <div className="h-16 p-1 border rounded-md text-muted-foreground">1</div>
                      <div className="h-16 p-1 border rounded-md text-muted-foreground">2</div>
                      <div className="h-16 p-1 border rounded-md text-muted-foreground">3</div>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full bg-primary"></div>
                        <span className="text-sm">Appointments</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 rounded-full bg-red-100/10"></div>
                        <span className="text-sm">Time Off</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
