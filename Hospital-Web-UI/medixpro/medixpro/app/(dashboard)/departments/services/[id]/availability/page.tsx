"use client";

import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Copy, Info, Loader2, Plus, Save, Trash, X } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
type TimeSlot = {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  provider: string;
  booked: number;
};

type Service = {
  id: string;
  name: string;
  department: string;
  type: string;
  duration: number;
  price: number;
  description: string;
  providers: {
    id: string;
    name: string;
    role: string;
    image: string;
    assigned: boolean;
  }[];
  availability: {
    [date: string]: TimeSlot[]; // <--- THIS FIXES THE ERROR
  };
  blockedDates: string[];
  recurringSchedule: {
    [day in "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"]: {
      startTime: string;
      endTime: string;
      capacity: number;
      provider: string;
    }[];
  };
};

export default function ManageServiceAvailabilityPage({ params }: { params: Promise<{ id: string }> }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddSlotDialog, setShowAddSlotDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any | null>(null);
  const [showTimeSlotDetails, setShowTimeSlotDetails] = useState(false);

  // In a real application, you would fetch the service details based on the ID
  // For this example, we'll use mock data
  const { id } = use(params);
  const [service, setService] = useState<Service>({
    id: id,
    name: "MRI Scan",
    department: "Radiology",
    type: "Diagnostic",
    duration: 45,
    price: 850,
    description: "Magnetic Resonance Imaging (MRI) is a non-invasive imaging technology.",
    providers: [
      { id: "1", name: "Dr. Sarah Johnson", role: "Radiologist", image: "/abstract-jr.png", assigned: true },
      { id: "2", name: "Dr. Michael Chen", role: "Radiologist", image: "/abstract-geometric-lt.png", assigned: true },
      {
        id: "3",
        name: "Dr. Emily Rodriguez",
        role: "Neuroradiologist",
        image: "/stylized-initials.png",
        assigned: true,
      },
    ],
    availability: {
      // Sample data for the current month
      "2023-05-01": [
        { id: "1", startTime: "09:00", endTime: "10:00", capacity: 1, provider: "1", booked: 0 },
        { id: "2", startTime: "10:30", endTime: "11:30", capacity: 1, provider: "2", booked: 1 },
        { id: "3", startTime: "13:00", endTime: "14:00", capacity: 1, provider: "1", booked: 0 },
      ],
      "2023-05-02": [
        { id: "4", startTime: "09:00", endTime: "10:00", capacity: 1, provider: "3", booked: 0 },
        { id: "5", startTime: "11:00", endTime: "12:00", capacity: 1, provider: "2", booked: 0 },
      ],
      "2023-05-03": [{ id: "6", startTime: "14:00", endTime: "15:00", capacity: 1, provider: "1", booked: 1 }],
      "2023-05-08": [
        { id: "7", startTime: "09:00", endTime: "10:00", capacity: 1, provider: "1", booked: 0 },
        { id: "8", startTime: "10:30", endTime: "11:30", capacity: 1, provider: "2", booked: 0 },
      ],
      "2023-05-09": [{ id: "9", startTime: "13:00", endTime: "14:00", capacity: 1, provider: "3", booked: 0 }],
      "2023-05-15": [{ id: "10", startTime: "09:00", endTime: "10:00", capacity: 1, provider: "1", booked: 0 }],
      "2023-05-16": [{ id: "11", startTime: "11:00", endTime: "12:00", capacity: 1, provider: "2", booked: 0 }],
      "2023-05-22": [{ id: "12", startTime: "14:00", endTime: "15:00", capacity: 1, provider: "3", booked: 0 }],
      "2023-05-23": [{ id: "13", startTime: "09:00", endTime: "10:00", capacity: 1, provider: "1", booked: 0 }],
      "2023-05-29": [{ id: "14", startTime: "10:30", endTime: "11:30", capacity: 1, provider: "2", booked: 0 }],
      "2023-05-30": [{ id: "15", startTime: "13:00", endTime: "14:00", capacity: 1, provider: "3", booked: 0 }],
    },
    blockedDates: ["2023-05-05", "2023-05-12", "2023-05-19", "2023-05-26"], // Fridays blocked
    recurringSchedule: {
      monday: [
        { startTime: "09:00", endTime: "10:00", capacity: 1, provider: "1" },
        { startTime: "10:30", endTime: "11:30", capacity: 1, provider: "2" },
        { startTime: "13:00", endTime: "14:00", capacity: 1, provider: "1" },
      ],
      tuesday: [
        { startTime: "09:00", endTime: "10:00", capacity: 1, provider: "3" },
        { startTime: "11:00", endTime: "12:00", capacity: 1, provider: "2" },
      ],
      wednesday: [{ startTime: "14:00", endTime: "15:00", capacity: 1, provider: "1" }],
      thursday: [],
      friday: [], // No slots on Friday
      saturday: [],
      sunday: [],
    },
  });

  const [newTimeSlot, setNewTimeSlot] = useState({
    startTime: "09:00",
    endTime: "10:00",
    capacity: 1,
    provider: service.providers[0].id,
    repeat: "none",
    repeatUntil: "",
  });

  const handleSave = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }, 1500);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleAddTimeSlot = () => {
    if (!selectedDate) return;

    const dateString = selectedDate.toISOString().split("T")[0];
    const newSlot = {
      id: Math.random().toString(36).substring(7),
      startTime: newTimeSlot.startTime,
      endTime: newTimeSlot.endTime,
      capacity: newTimeSlot.capacity,
      provider: newTimeSlot.provider,
      booked: 0,
    };

    // Handle repeating slots
    if (newTimeSlot.repeat !== "none" && newTimeSlot.repeatUntil) {
      const repeatUntil = new Date(newTimeSlot.repeatUntil);
      const currentDate = new Date(selectedDate);

      while (currentDate <= repeatUntil) {
        const currentDateString = currentDate.toISOString().split("T")[0];

        // Skip blocked dates
        if (!service.blockedDates.includes(currentDateString)) {
          const dayOfWeek = currentDate.getDay();

          // For weekly repeat, add the slot on the same day of the week
          if (newTimeSlot.repeat === "weekly" && dayOfWeek === selectedDate.getDay()) {
            setService((prev: any) => ({
              ...prev,
              availability: {
                ...prev.availability,
                [currentDateString]: [...(prev.availability[currentDateString] || []), { ...newSlot, id: Math.random().toString(36).substring(7) }],
              },
            }));
          }

          // For daily repeat, add the slot every day
          if (newTimeSlot.repeat === "daily") {
            setService((prev: any) => ({
              ...prev,
              availability: {
                ...prev.availability,
                [currentDateString]: [...(prev.availability[currentDateString] || []), { ...newSlot, id: Math.random().toString(36).substring(7) }],
              },
            }));
          }
        }

        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Add a single slot
      setService((prev: any) => ({
        ...prev,
        availability: {
          ...prev.availability,
          [dateString]: [...(prev.availability[dateString] || []), newSlot],
        },
      }));
    }

    setShowAddSlotDialog(false);
    setNewTimeSlot({
      startTime: "09:00",
      endTime: "10:00",
      capacity: 1,
      provider: service.providers[0].id,
      repeat: "none",
      repeatUntil: "",
    });
  };

  const handleRemoveTimeSlot = (date: string, slotId: string) => {
    setService((prev: any) => ({
      ...prev,
      availability: {
        ...prev.availability,
        [date]: prev.availability[date].filter((slot: any) => slot.id !== slotId),
      },
    }));
  };

  const handleViewTimeSlot = (date: string, slot: any) => {
    setSelectedDate(new Date(date));
    setSelectedTimeSlot(slot);
    setShowTimeSlotDetails(true);
  };

  const handleApplyRecurringSchedule = () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      // In a real app, you would apply the recurring schedule to future dates
      setIsLoading(false);
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    }, 1500);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();

    // Calculate the number of days in the month
    const daysInMonth = lastDay.getDate();

    // Create an array of day numbers (1-31)
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Create an array for the calendar grid (6 rows x 7 columns)
    const calendarGrid = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      calendarGrid.push(null);
    }

    // Add the days of the month
    days.forEach((day) => {
      calendarGrid.push(day);
    });

    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - calendarGrid.length;
    for (let i = 0; i < remainingCells; i++) {
      calendarGrid.push(null);
    }

    // Split the grid into rows (weeks)
    const weeks = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      weeks.push(calendarGrid.slice(i, i + 7));
    }

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {currentMonth.toLocaleString("default", { month: "long" })} {currentMonth.getFullYear()}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-medium text-sm py-2">
              {day}
            </div>
          ))}

          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              if (day === null) {
                return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-24 border rounded-md bg-muted/20" />;
              }

              const date = new Date(year, month, day);
              const dateString = date.toISOString().split("T")[0];
              const isBlocked = service.blockedDates.includes(dateString);
              const timeSlots = service.availability[dateString] || [];
              const hasSlots = timeSlots.length > 0;

              return (
                <div
                  key={`day-${day}`}
                  className={`h-24 border rounded-md p-1 overflow-hidden ${isBlocked ? "bg-muted/30" : hasSlots ? "bg-primary/5" : ""}`}
                  onClick={() => {
                    if (!isBlocked) {
                      setSelectedDate(date);
                      setShowAddSlotDialog(true);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{day}</span>
                    {isBlocked && (
                      <Badge variant="outline" className="text-xs">
                        Blocked
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 space-y-1">
                    {timeSlots.slice(0, 2).map((slot: any) => (
                      <div
                        key={slot.id}
                        className="text-xs bg-primary/10 rounded px-1 py-0.5 truncate cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTimeSlot(dateString, slot);
                        }}
                      >
                        {slot.startTime} - {slot.endTime}
                      </div>
                    ))}
                    {timeSlots.length > 2 && <div className="text-xs text-muted-foreground">+{timeSlots.length - 2} more</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const getProviderById = (id: string) => {
    return service.providers.find((provider) => provider.id === id);
  };

  return (
    <div className="flex flex-col gap-6">
      {showSuccessAlert && (
        <Alert className="bg-green-50 border-green-500">
          <Info className="h-4 w-4 text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Service availability updated successfully.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/departments/services/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Manage Availability</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/departments/services/${id}`}>Cancel</Link>
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="md:grid max-md:space-x-4 md:gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Service: {service.name}</CardTitle>
            <CardDescription>
              Department: {service.department} | Duration: {service.duration} minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="calendar" className="w-full">
              <TabsList>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>
              <TabsContent value="calendar" className="mt-4">
                {renderCalendar()}
              </TabsContent>
              <TabsContent value="list" className="mt-4">
                <div className="space-y-4">
                  {Object.entries(service.availability).length > 0 ? (
                    Object.entries(service.availability)
                      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                      .map(([date, slots]) => (
                        <Card key={date}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-base">
                              {new Date(date).toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-2">
                            <Table className="whitespace-nowrap">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Time</TableHead>
                                  <TableHead>Provider</TableHead>
                                  <TableHead>Capacity</TableHead>
                                  <TableHead>Booked</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="whitespace-nowrap">
                                {slots.map((slot) => {
                                  const provider = getProviderById(slot.provider);
                                  return (
                                    <TableRow key={slot.id}>
                                      <TableCell>
                                        {slot.startTime} - {slot.endTime}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Avatar className="h-6 w-6">
                                            <AvatarImage src={provider?.image || ""} alt={provider?.name || ""} />
                                            <AvatarFallback>{provider?.name.charAt(0) || "?"}</AvatarFallback>
                                          </Avatar>
                                          <span className="text-sm">{provider?.name}</span>
                                        </div>
                                      </TableCell>
                                      <TableCell>{slot.capacity}</TableCell>
                                      <TableCell>
                                        {slot.booked > 0 ? (
                                          <Badge variant="outline" className="bg-primary/10">
                                            {slot.booked}/{slot.capacity}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline">0/{slot.capacity}</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveTimeSlot(date, slot.id)} disabled={slot.booked > 0}>
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No availability slots configured. Use the calendar view to add slots.</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recurring Schedule</CardTitle>
              <CardDescription>Set up a weekly recurring schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Monday</Label>
                <div className="space-y-2">
                  {service.recurringSchedule.monday.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-3 w-3" />
                    Add Slot
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tuesday</Label>
                <div className="space-y-2">
                  {service.recurringSchedule.tuesday.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-3 w-3" />
                    Add Slot
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Wednesday</Label>
                <div className="space-y-2">
                  {service.recurringSchedule.wednesday.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-3 w-3" />
                    Add Slot
                  </Button>
                </div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    View More Days
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium">Other Days</h4>
                    <p className="text-sm text-muted-foreground">Configure availability for Thursday, Friday, Saturday, and Sunday.</p>
                  </div>
                </PopoverContent>
              </Popover>

              <Button onClick={handleApplyRecurringSchedule} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                Apply Recurring Schedule
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blocked Dates</CardTitle>
              <CardDescription>Dates when this service is not available</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {service.blockedDates.map((date, index) => (
                  <div key={index} className="flex items-center justify-between text-sm border rounded-md p-2">
                    <span>
                      {new Date(date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Block Date
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Time Slot Dialog */}
      <Dialog open={showAddSlotDialog} onOpenChange={setShowAddSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Time Slot</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>
                  Add availability for{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" type="time" value={newTimeSlot.startTime} onChange={(e) => setNewTimeSlot({ ...newTimeSlot, startTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" type="time" value={newTimeSlot.endTime} onChange={(e) => setNewTimeSlot({ ...newTimeSlot, endTime: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={newTimeSlot.provider} onValueChange={(value) => setNewTimeSlot({ ...newTimeSlot, provider: value })}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {service.providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min="1" value={newTimeSlot.capacity} onChange={(e) => setNewTimeSlot({ ...newTimeSlot, capacity: Number.parseInt(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repeat">Repeat</Label>
              <Select value={newTimeSlot.repeat} onValueChange={(value) => setNewTimeSlot({ ...newTimeSlot, repeat: value })}>
                <SelectTrigger id="repeat">
                  <SelectValue placeholder="Select repeat option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newTimeSlot.repeat !== "none" && (
              <div className="space-y-2">
                <Label htmlFor="repeatUntil">Repeat Until</Label>
                <Input id="repeatUntil" type="date" value={newTimeSlot.repeatUntil} onChange={(e) => setNewTimeSlot({ ...newTimeSlot, repeatUntil: e.target.value })} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSlotDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTimeSlot}>Add Time Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Slot Details Dialog */}
      <Dialog open={showTimeSlotDetails} onOpenChange={setShowTimeSlotDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time Slot Details</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>
                  Details for{" "}
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedTimeSlot && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Time</Label>
                  <p className="font-medium">
                    {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Capacity</Label>
                  <p className="font-medium">{selectedTimeSlot.capacity}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Provider</Label>
                {(() => {
                  const provider = getProviderById(selectedTimeSlot.provider);
                  return (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={provider?.image || ""} alt={provider?.name || ""} />
                        <AvatarFallback>{provider?.name.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <span>{provider?.name}</span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Booking Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={selectedTimeSlot.booked > 0 ? "default" : "outline"}>
                    {selectedTimeSlot.booked}/{selectedTimeSlot.capacity} Booked
                  </Badge>
                  {selectedTimeSlot.booked > 0 ? <span className="text-sm text-muted-foreground">Cannot be deleted</span> : <span className="text-sm text-muted-foreground">Available for booking</span>}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeSlotDetails(false)}>
              Close
            </Button>
            {selectedTimeSlot && selectedTimeSlot.booked === 0 && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedDate && selectedTimeSlot) {
                    const dateString = selectedDate.toISOString().split("T")[0];
                    handleRemoveTimeSlot(dateString, selectedTimeSlot.id);
                    setShowTimeSlotDetails(false);
                  }
                }}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Slot
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
