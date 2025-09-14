"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample appointments data
const appointments = [
  {
    id: "1",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
    },
    doctor: "Dr. Sarah Johnson",
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    time: "10:00 AM",
    endTime: "10:30 AM",
    status: "Confirmed",
    type: "Check-up",
    duration: 30,
    department: "General Medicine",
    color: "blue",
  },
  {
    id: "2",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
    },
    doctor: "Dr. Michael Chen",
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    time: "11:30 AM",
    endTime: "12:15 PM",
    status: "In Progress",
    type: "Consultation",
    duration: 45,
    department: "Cardiology",
    color: "amber",
  },
  {
    id: "3",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
    },
    doctor: "Dr. Lisa Patel",
    date: new Date(new Date().setHours(0, 0, 0, 0)),
    time: "02:15 PM",
    endTime: "02:35 PM",
    status: "Completed",
    type: "Follow-up",
    duration: 20,
    department: "Orthopedics",
    color: "green",
  },
  {
    id: "4",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
    },
    doctor: "Dr. James Wilson",
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    time: "09:00 AM",
    endTime: "10:00 AM",
    status: "Confirmed",
    type: "Dental Cleaning",
    duration: 60,
    department: "Dental",
    color: "purple",
  },
  {
    id: "5",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
    },
    doctor: "Dr. Emily Rodriguez",
    date: new Date(new Date().setDate(new Date().getDate() + 1)),
    time: "10:30 AM",
    endTime: "10:45 AM",
    status: "Confirmed",
    type: "X-Ray",
    duration: 15,
    department: "Radiology",
    color: "indigo",
  },
  {
    id: "6",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
    },
    doctor: "Dr. Robert Kim",
    date: new Date(new Date().setDate(new Date().getDate() - 1)),
    time: "01:45 PM",
    endTime: "02:30 PM",
    status: "Cancelled",
    type: "Therapy Session",
    duration: 45,
    department: "Psychiatry",
    color: "red",
  },
  {
    id: "7",
    patient: {
      name: "David Miller",
      image: "/user-3.png",
    },
    doctor: "Dr. Jennifer Lee",
    date: new Date(new Date().setDate(new Date().getDate() - 2)),
    time: "11:00 AM",
    endTime: "12:00 PM",
    status: "Completed",
    type: "Annual Physical",
    duration: 60,
    department: "General Medicine",
    color: "blue",
  },
  {
    id: "8",
    patient: {
      name: "Amanda Clark",
      image: "/user-3.png",
    },
    doctor: "Dr. Thomas Brown",
    date: new Date(new Date().setDate(new Date().getDate() - 3)),
    time: "09:30 AM",
    endTime: "09:45 AM",
    status: "Cancelled",
    type: "Vaccination",
    duration: 15,
    department: "Pediatrics",
    color: "teal",
  },
];

// Time slots for day view
const timeSlots = ["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];

// Days of the week
const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const shortDaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Function to get appointments for a specific date
const getAppointmentsForDate = (date: any) => {
  return appointments.filter((appointment) => appointment.date.getDate() === date.getDate() && appointment.date.getMonth() === date.getMonth() && appointment.date.getFullYear() === date.getFullYear());
};

// Function to get appointments for a specific week
const getAppointmentsForWeek = (date: any) => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday

  return appointments.filter((appointment) => appointment.date >= startOfWeek && appointment.date <= endOfWeek);
};

// Function to get appointments for a specific month
const getAppointmentsForMonth = (date: any) => {
  return appointments.filter((appointment) => appointment.date.getMonth() === date.getMonth() && appointment.date.getFullYear() === date.getFullYear());
};

// Function to get days in month
const getDaysInMonth = (year: any, month: any) => {
  return new Date(year, month + 1, 0).getDate();
};

// Function to get first day of month
const getFirstDayOfMonth = (year: any, month: any) => {
  return new Date(year, month, 1).getDay();
};

// Function to format time (e.g., "10:00 AM")
const formatTime = (timeString: any) => {
  return timeString;
};

// Function to get status badge variant
const getStatusBadge = (status: any) => {
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
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export default function CalendarPage() {
  const [view, setView] = useState("day"); // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState("all");

  // Navigate to previous period
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() - 1);
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (view === "month") {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  // Navigate to next period
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() + 1);
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (view === "month") {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Go to today
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format date range for header
  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };

    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", options);
    } else if (view === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday

      return `${startOfWeek.toLocaleDateString("en-US", options)} - ${endOfWeek.toLocaleDateString("en-US", options)}`;
    } else if (view === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  };

  // Get current appointments based on view
  const getCurrentAppointments = () => {
    if (view === "day") {
      return getAppointmentsForDate(currentDate);
    } else if (view === "week") {
      return getAppointmentsForWeek(currentDate);
    } else if (view === "month") {
      return getAppointmentsForMonth(currentDate);
    }
    return [];
  };

  // Filter appointments by doctor if needed
  const filteredAppointments = getCurrentAppointments().filter((appointment) => selectedDoctor === "all" || appointment.doctor.includes(selectedDoctor));

  // Render day view
  const renderDayView = () => {
    const appointmentsForDay = filteredAppointments;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="flex border rounded-md overflow-hidden">
              <div className="md:w-20 p-1 md:p-2 bg-muted flex items-center justify-center border-r">
                <span className="text-xs md:text-sm font-medium">{timeSlot}</span>
              </div>
              <div className="flex-1 p-1 md:p-2 min-h-[80px]">
                {appointmentsForDay
                  .filter((appointment) => appointment.time.includes(timeSlot.split(":")[0]))
                  .map((appointment) => (
                    <div key={appointment.id} className={`p-2 mb-1 rounded-md bg-${appointment.color}-500/10 border border-${appointment.color}-300`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={appointment.patient.image || "/user-2.png"} alt={appointment.patient.name} />
                            <AvatarFallback>{appointment.patient.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{appointment.patient.name}</span>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground max-sm:hidden">
                        <div className="flex justify-between">
                          <span>
                            {appointment.time} - {appointment.endTime}
                          </span>
                          <span>{appointment.type}</span>
                        </div>
                        <div>{appointment.doctor}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {weekDays.map((day, index) => (
          <div key={index} className="text-center p-0.5 md:p-2 bg-muted rounded-t-md">
            <div className="font-medium text-xs md:text-sm">{shortDaysOfWeek[index]}</div>
            <div className="text-xs md:text-sm">{day.getDate()}</div>
          </div>
        ))}

        {/* Appointment cells */}
        {weekDays.map((day, index) => {
          const dayAppointments = filteredAppointments.filter((appointment) => appointment.date.getDate() === day.getDate() && appointment.date.getMonth() === day.getMonth() && appointment.date.getFullYear() === day.getFullYear());

          return (
            <div key={index} className="border rounded-b-md md:p-2 min-h-[200px] max-h-[400px] overflow-y-auto">
              {dayAppointments.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs md:text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4 md:h-6 md:w-6 mr-2 md:hidden" />
                  <span className="max-md:hidden">No appointments</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayAppointments.map((appointment) => (
                    <div key={appointment.id} className={`md:p-2 rounded-md bg-${appointment.color}-500/10 border border-${appointment.color}-300`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs md:text-sm">{appointment.patient.name}</span>
                        <span className="text-xs max-md:hidden">{appointment.time}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground max-md:hidden">
                        <div>{appointment.type}</div>
                        <div>{appointment.doctor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    // Create array of day numbers with empty spots for the first week
    const days: (number | null)[] = [...Array.from({ length: firstDayOfMonth }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

    // Pad with empty spots to make complete weeks
    const totalDays = Math.ceil(days.length / 7) * 7;
    const paddedDays = days.concat(Array.from({ length: totalDays - days.length }, () => null));

    // Split into weeks
    const weeks = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weeks.push(paddedDays.slice(i, i + 7));
    }

    return (
      <div className="space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2">
          {shortDaysOfWeek.map((day) => (
            <div key={day} className="text-center p-0.5 md:p-2 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-2">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.map((day, dayIndex) => {
                if (day === null) {
                  return <div key={`empty-${dayIndex}`} className="border rounded-md p-0.5 md:p-2 h-24 bg-muted/20"></div>;
                }

                const date = new Date(year, month, day);
                const dayAppointments = filteredAppointments.filter((appointment) => appointment.date.getDate() === day && appointment.date.getMonth() === month && appointment.date.getFullYear() === year);

                const isToday = date.getDate() === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();

                return (
                  <div key={day} className={`border rounded-md p-0.5 md:p-2 h-24 overflow-y-auto ${isToday ? "border-blue-300" : ""}`}>
                    <div className={`text-right text-xs md:text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>{day}</div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment) => (
                        <div key={appointment.id} className={`p-1 rounded text-xs bg-${appointment.color}-500/10 dark:border border-neutral-500 truncate`}>
                          {appointment.time} - {appointment.patient.name}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && <div className="text-xs text-center text-muted-foreground">+{dayAppointments.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="icon" asChild>
          <Link href="/appointments">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Appointment Calendar</h2>
          <p className="text-muted-foreground">View and manage appointments in calendar view.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <CardTitle>Calendar</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{formatDateRange()}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <Tabs value={view} onValueChange={setView} className="w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by doctor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  <SelectItem value="Dr. Sarah Johnson">Dr. Sarah Johnson</SelectItem>
                  <SelectItem value="Dr. Michael Chen">Dr. Michael Chen</SelectItem>
                  <SelectItem value="Dr. Lisa Patel">Dr. Lisa Patel</SelectItem>
                  <SelectItem value="Dr. James Wilson">Dr. James Wilson</SelectItem>
                  <SelectItem value="Dr. Emily Rodriguez">Dr. Emily Rodriguez</SelectItem>
                </SelectContent>
              </Select>
              <Button href="/appointments/add">
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </div>

          {view === "day" && renderDayView()}
          {view === "week" && renderWeekView()}
          {view === "month" && renderMonthView()}
        </CardContent>
      </Card>
    </div>
  );
}
