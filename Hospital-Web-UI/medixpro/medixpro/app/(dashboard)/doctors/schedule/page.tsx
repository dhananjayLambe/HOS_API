"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addDays, addHours, addMonths, addWeeks, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, isSameMonth, parseISO, setHours, setMinutes, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

// Sample doctors data
const doctors = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    image: "/colorful-abstract-shapes.png",
    specialty: "Cardiology",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    image: "/colorful-abstract-shapes.png",
    specialty: "Neurology",
  },
  {
    id: "3",
    name: "Dr. Lisa Patel",
    image: "/user-3.png",
    specialty: "Pediatrics",
  },
  {
    id: "4",
    name: "Dr. James Wilson",
    image: "/user-3.png",
    specialty: "Orthopedics",
  },
];

// Generate sample appointments
const generateAppointments = () => {
  const appointments = [];
  const today = new Date();
  const startDate = startOfWeek(today);

  for (let i = 0; i < 50; i++) {
    const doctorId = doctors[Math.floor(Math.random() * doctors.length)].id;
    const dayOffset = Math.floor(Math.random() * 28) - 7; // Include past and future appointments
    const hourOffset = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
    const date = addDays(startDate, dayOffset);
    const startTime = setHours(setMinutes(date, 0), hourOffset);
    const endTime = addHours(startTime, 1);
    const status = ["Confirmed", "In Progress", "Completed", "Cancelled"][Math.floor(Math.random() * 4)];

    appointments.push({
      id: `app-${i}`,
      doctorId,
      patientName: ["John Smith", "Emily Davis", "Robert Wilson", "Jessica Brown", "Michael Johnson"][Math.floor(Math.random() * 5)],
      date: format(date, "yyyy-MM-dd"),
      startTime: format(startTime, "HH:mm"),
      endTime: format(endTime, "HH:mm"),
      status,
      type: ["Check-up", "Consultation", "Follow-up", "Procedure", "Emergency"][Math.floor(Math.random() * 5)],
    });
  }

  return appointments;
};

const appointments = generateAppointments();

// Time slots for the day view
const timeSlots = Array.from({ length: 9 }, (_, i) => {
  const hour = i + 9; // Start from 9 AM
  return `${hour}:00 ${hour < 12 ? "AM" : hour === 12 ? "PM" : `${hour - 12} PM`}`;
});

// Days of the week for the week view header
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorSchedulePage() {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [weekStartDate, setWeekStartDate] = useState<Date>(startOfWeek(new Date()));
  const [monthDate, setMonthDate] = useState<Date>(new Date());

  // Week view dates
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  }, [weekStartDate]);

  // Calendar grid including days from previous/next months to fill the grid
  const calendarDays = useMemo(() => {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = getDay(start);

    // Get days from previous month to fill the first row
    const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => addDays(start, -firstDayOfMonth + i));

    // Get all days of the current month
    const currentMonthDays = eachDayOfInterval({ start, end });

    // Calculate how many days we need from the next month to complete the grid
    const remainingDays = (7 - ((firstDayOfMonth + currentMonthDays.length) % 7)) % 7;

    // Get days from next month
    const nextMonthDays = Array.from({ length: remainingDays }, (_, i) => addDays(end, i + 1));

    // Combine all days
    return [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
  }, [monthDate]);

  // Filter appointments based on selected doctor and date
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const isDateMatch = appointment.date === format(date, "yyyy-MM-dd");
      const isDoctorMatch = selectedDoctor === "all" || appointment.doctorId === selectedDoctor;
      return isDateMatch && isDoctorMatch;
    });
  }, [date, selectedDoctor]);

  // Filter appointments for week view
  const weekAppointments = useMemo(() => {
    const weekStart = format(weekStartDate, "yyyy-MM-dd");
    const weekEnd = format(addDays(weekStartDate, 6), "yyyy-MM-dd");

    return appointments.filter((appointment) => {
      const appointmentDate = parseISO(appointment.date);
      const isInWeek = appointmentDate >= parseISO(weekStart) && appointmentDate <= parseISO(weekEnd);
      const isDoctorMatch = selectedDoctor === "all" || appointment.doctorId === selectedDoctor;
      return isInWeek && isDoctorMatch;
    });
  }, [weekStartDate, selectedDoctor]);

  // Get appointments for a specific day
  const getAppointmentsForDay = (day: Date) => {
    const dayString = format(day, "yyyy-MM-dd");
    return appointments.filter((app) => {
      return app.date === dayString && (selectedDoctor === "all" || app.doctorId === selectedDoctor);
    });
  };

  // Navigate to previous week
  const goToPreviousWeek = () => {
    setWeekStartDate(subWeeks(weekStartDate, 1));
  };

  // Navigate to next week
  const goToNextWeek = () => {
    setWeekStartDate(addWeeks(weekStartDate, 1));
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setMonthDate(subMonths(monthDate, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setMonthDate(addMonths(monthDate, 1));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/doctors">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Doctor Schedule</h1>
          <p className="text-muted-foreground">Manage and view doctor schedules and appointments.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Card className="md:w-80">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view schedules.</CardDescription>
          </CardHeader>
          <CardContent className="!p-2">
            <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} className="rounded-md border" />
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Filter by Doctor</h3>
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Doctors</SelectItem>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex-1">
          <Tabs defaultValue="day" className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">{format(date, "MMMM d, yyyy")}</div>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="day" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Daily Schedule</CardTitle>
                  <CardDescription>
                    Schedule for {format(date, "MMMM d, yyyy")} • {selectedDoctor === "all" ? "All Doctors" : doctors.find((d) => d.id === selectedDoctor)?.name || "Unknown Doctor"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {timeSlots.map((timeSlot, index) => {
                      const slotAppointments = filteredAppointments.filter((app) => app.startTime.startsWith(`${index + 9}:`));

                      return (
                        <div key={timeSlot} className="grid grid-cols-[80px_1fr] gap-4">
                          <div className="text-sm text-muted-foreground py-3">{timeSlot}</div>
                          <div className="border-t py-3 relative min-h-[60px]">
                            {slotAppointments.length > 0 ? (
                              <div className="space-y-2">
                                {slotAppointments.map((app) => (
                                  <div
                                    key={app.id}
                                    className={`rounded-md p-2 text-sm ${app.status === "Confirmed" ? "bg-blue-500/10 border-l-4 border-blue-500" : app.status === "In Progress" ? "bg-amber-500/10 border-l-4 border-amber-500" : app.status === "Completed" ? "bg-green-500/10 border-l-4 border-green-500" : "bg-red-500/10 border-l-4 border-red-500"}`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-medium">{app.patientName}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {app.startTime} - {app.endTime} • {app.type}
                                        </p>
                                      </div>
                                      <Badge
                                        variant={app.status === "Confirmed" ? "outline" : app.status === "In Progress" ? "default" : app.status === "Completed" ? "success" : "destructive"}
                                        className={app.status === "Confirmed" ? "border-blue-500 text-blue-500" : app.status === "In Progress" ? "bg-amber-500" : app.status === "Completed" ? "bg-green-500" : "bg-red-500"}
                                      >
                                        {app.status}
                                      </Badge>
                                    </div>
                                    {selectedDoctor === "all" && (
                                      <div className="mt-1 flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                          <AvatarImage src={doctors.find((d) => d.id === app.doctorId)?.image || "/user-2.png"} alt={doctors.find((d) => d.id === app.doctorId)?.name || ""} />
                                          <AvatarFallback>{doctors.find((d) => d.id === app.doctorId)?.name.charAt(0) || "?"}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs">{doctors.find((d) => d.id === app.doctorId)?.name || "Unknown Doctor"}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-muted-foreground">No appointments</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="week" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Weekly Schedule</CardTitle>
                  <CardDescription>
                    Week of {format(weekStartDate, "MMMM d")} - {format(addDays(weekStartDate, 6), "MMMM d, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNextWeek}>
                      Next Week <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* Week header */}
                      <div className="grid grid-cols-8 gap-1">
                        <div className="h-12"></div> {/* Empty cell for time column */}
                        {weekDates.map((day, index) => (
                          <div key={index} className={`text-center p-2 font-medium ${isSameDay(day, new Date()) ? "bg-blue-500/10 rounded-t-md" : ""}`}>
                            <div>{weekDays[index]}</div>
                            <div className={`text-sm ${isSameDay(day, new Date()) ? "text-blue-600" : "text-muted-foreground"}`}>{format(day, "MMM d")}</div>
                          </div>
                        ))}
                      </div>

                      {/* Time slots */}
                      {timeSlots.map((timeSlot, timeIndex) => (
                        <div key={timeIndex} className="grid grid-cols-8 gap-1">
                          <div className="text-sm text-muted-foreground p-2 text-right">{timeSlot}</div>

                          {weekDates.map((day, dayIndex) => {
                            const dayStr = format(day, "yyyy-MM-dd");
                            const hourStr = `${timeIndex + 9}:`;
                            const dayAppointments = weekAppointments.filter((app) => app.date === dayStr && app.startTime.startsWith(hourStr));

                            return (
                              <div key={dayIndex} className={`border-t min-h-[80px] p-1 ${isSameDay(day, new Date()) ? "bg-blue-500/10" : ""}`}>
                                {dayAppointments.length > 0 ? (
                                  <div className="space-y-1">
                                    {dayAppointments.map((app) => (
                                      <div
                                        key={app.id}
                                        className={`rounded text-xs p-1 ${app.status === "Confirmed" ? "bg-blue-500/10 border-l-2 border-blue-500" : app.status === "In Progress" ? "bg-amber-500/10 border-l-2 border-amber-500" : app.status === "Completed" ? "bg-green-500/10 border-l-2 border-green-500" : "bg-red-500/10 border-l-2 border-red-500"}`}
                                      >
                                        <div className="font-medium truncate">{app.patientName}</div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {app.startTime} - {app.endTime}
                                        </div>
                                        {selectedDoctor === "all" && (
                                          <div className="flex items-center gap-1 mt-1">
                                            <Avatar className="h-3 w-3">
                                              <AvatarImage src={doctors.find((d) => d.id === app.doctorId)?.image || "/user-2.png"} alt="" />
                                              <AvatarFallback className="text-[8px]">{doctors.find((d) => d.id === app.doctorId)?.name.charAt(0) || "?"}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-[10px] truncate">{doctors.find((d) => d.id === app.doctorId)?.name || "Unknown"}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="month" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Monthly Schedule</CardTitle>
                  <CardDescription>{format(monthDate, "MMMM yyyy")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center gap-2 flex-wrap mb-4">
                    <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous Month
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNextMonth}>
                      Next Month <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2 overflow-x-auto">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="font-medium text-sm py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                      const dayAppointments = getAppointmentsForDay(day);
                      const isCurrentMonth = isSameMonth(day, monthDate);
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div key={i} className={`min-h-[100px] border rounded-md p-1 ${!isCurrentMonth ? "bg-gray-500/20 opacity-50" : ""} ${isToday ? "border-blue-500 bg-blue-500/10" : ""}`}>
                          <div className={`text-right text-sm mb-1 ${isToday ? "font-bold text-blue-600" : ""}`}>{format(day, "d")}</div>

                          <div className="space-y-1">
                            {dayAppointments.length > 0 ? (
                              <>
                                {dayAppointments.slice(0, 3).map((app) => (
                                  <div key={app.id} className={`rounded text-xs p-1 ${app.status === "Confirmed" ? "bg-blue-500/10" : app.status === "In Progress" ? "bg-amber-500/10" : app.status === "Completed" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                                    <div className="truncate">{app.patientName}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{app.startTime}</div>
                                  </div>
                                ))}

                                {dayAppointments.length > 3 && <div className="text-xs text-center text-muted-foreground">+{dayAppointments.length - 3} more</div>}
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card>
                <CardHeader>
                  <CardTitle>Appointments List</CardTitle>
                  <CardDescription>
                    All appointments for {format(date, "MMMM d, yyyy")} • {selectedDoctor === "all" ? "All Doctors" : doctors.find((d) => d.id === selectedDoctor)?.name || "Unknown Doctor"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredAppointments.length > 0 ? (
                    <div className="space-y-4 overflow-x-auto">
                      {filteredAppointments.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-2 lg:p-4 border rounded-md">
                          <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${app.status === "Confirmed" ? "bg-blue-500" : app.status === "In Progress" ? "bg-amber-500" : app.status === "Completed" ? "bg-green-500" : "bg-red-500"}`} />
                            <div>
                              <p className="font-medium line-clamp-1 text-sm lg:text-base">{app.patientName}</p>
                              <div className="flex items-center text-xs lg:text-sm text-muted-foreground">
                                <Clock className="mr-1 h-3 w-3" />
                                {app.startTime} - {app.endTime}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {selectedDoctor === "all" && (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={doctors.find((d) => d.id === app.doctorId)?.image || "/user-2.png"} alt={doctors.find((d) => d.id === app.doctorId)?.name || ""} />
                                  <AvatarFallback>{doctors.find((d) => d.id === app.doctorId)?.name.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm line-clamp-1">{doctors.find((d) => d.id === app.doctorId)?.name || "Unknown Doctor"}</span>
                              </div>
                            )}
                            <Badge
                              variant={app.status === "Confirmed" ? "outline" : app.status === "In Progress" ? "default" : app.status === "Completed" ? "success" : "destructive"}
                              className={app.status === "Confirmed" ? "border-blue-500 text-blue-500" : app.status === "In Progress" ? "bg-amber-500" : app.status === "Completed" ? "bg-green-500" : "bg-red-500"}
                            >
                              {app.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="mx-auto h-8 w-8 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-medium">No Appointments</h3>
                      <p className="text-sm text-muted-foreground">There are no appointments scheduled for this date.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
