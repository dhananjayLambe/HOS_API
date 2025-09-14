"use client";

import { useState, useEffect } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Filter, Plus, List, Grid, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AddEventModal } from "@/components/calendar/add-event-modal";
import { EditEventModal } from "@/components/calendar/edit-event-modal";

// Event categories with their colors
const eventCategories = [
  { id: "appointment", name: "Appointment", color: "bg-blue-500 dark:bg-blue-600" },
  { id: "meeting", name: "Meeting", color: "bg-green-500 dark:bg-green-600" },
  { id: "task", name: "Task", color: "bg-yellow-500 dark:bg-yellow-600" },
  { id: "reminder", name: "Reminder", color: "bg-purple-500 dark:bg-purple-600" },
  { id: "personal", name: "Personal", color: "bg-pink-500 dark:bg-pink-600" },
  { id: "holiday", name: "Holiday", color: "bg-red-500 dark:bg-red-600" },
];

// Sample events data
const initialEvents = [
  {
    id: "1",
    title: "Doctor's Meeting",
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(11, 30, 0, 0)),
    categoryId: "meeting",
    description: "Monthly staff meeting with all doctors",
    location: "Conference Room A",
  },
  {
    id: "2",
    title: "Patient Appointment - John Doe",
    start: addDays(new Date(new Date().setHours(14, 0, 0, 0)), 1),
    end: addDays(new Date(new Date().setHours(14, 30, 0, 0)), 1),
    categoryId: "appointment",
    description: "Follow-up appointment for surgery",
    location: "Examination Room 3",
  },
  {
    id: "3",
    title: "Medical Supplies Inventory",
    start: addDays(new Date(new Date().setHours(9, 0, 0, 0)), 2),
    end: addDays(new Date(new Date().setHours(12, 0, 0, 0)), 2),
    categoryId: "task",
    description: "Quarterly inventory check of all medical supplies",
    location: "Storage Room",
  },
  {
    id: "4",
    title: "Staff Training",
    start: addDays(new Date(new Date().setHours(13, 0, 0, 0)), 3),
    end: addDays(new Date(new Date().setHours(16, 0, 0, 0)), 3),
    categoryId: "meeting",
    description: "New equipment training session",
    location: "Training Room B",
  },
  {
    id: "5",
    title: "Hospital Board Meeting",
    start: addDays(new Date(new Date().setHours(15, 0, 0, 0)), 4),
    end: addDays(new Date(new Date().setHours(17, 0, 0, 0)), 4),
    categoryId: "meeting",
    description: "Quarterly board meeting",
    location: "Executive Boardroom",
  },
  {
    id: "6",
    title: "Clinic Closed - Holiday",
    start: addDays(new Date(new Date().setHours(0, 0, 0, 0)), 10),
    end: addDays(new Date(new Date().setHours(23, 59, 59, 0)), 10),
    categoryId: "holiday",
    description: "Clinic closed for national holiday",
    location: "All Departments",
  },
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(initialEvents);
  const [filteredEvents, setFilteredEvents] = useState(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [activeView, setActiveView] = useState("month");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(eventCategories.map((cat) => cat.id));

  // Filter events based on selected categories
  useEffect(() => {
    setFilteredEvents(events.filter((event) => selectedCategories.includes(event.categoryId)));
  }, [events, selectedCategories]);

  // Navigation functions
  const navigatePrevious = () => {
    if (activeView === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (activeView === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (activeView === "day") {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (activeView === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (activeView === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (activeView === "day") {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Event handlers
  const handleAddEvent = (newEvent: any) => {
    const eventWithId = { ...newEvent, id: (events.length + 1).toString() };
    setEvents([...events, eventWithId]);
    setIsAddEventOpen(false);
  };

  const handleEditEvent = (updatedEvent: any) => {
    setEvents(events.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)));
    setIsEditEventOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter((event) => event.id !== eventId));
    setIsEditEventOpen(false);
    setSelectedEvent(null);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEditEventOpen(true);
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Helper functions for rendering calendar views
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    // Days of week header
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const header = daysOfWeek.map((dayName) => (
      <div key={dayName} className="text-center font-medium py-2">
        {dayName}
      </div>
    ));

    // Calendar cells
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayEvents = filteredEvents.filter((event) => isSameDay(event.start, cloneDay));

        days.push(
          <div
            key={day.toString()}
            className={cn("h-32 border p-1 overflow-y-auto cursor-pointer", !isSameMonth(day, monthStart) && "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900", isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800")}
            onClick={() => {
              setCurrentDate(cloneDay);
              setIsAddEventOpen(true);
            }}
          >
            <div className="font-medium text-right mb-1">{formattedDate}</div>
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent opening the add modal when clicking on an event
                  handleEventClick(event);
                }}
                className={cn("text-xs p-1 mb-1 rounded truncate cursor-pointer text-white", eventCategories.find((cat) => cat.id === event.categoryId)?.color)}
              >
                {format(event.start, "HH:mm")} - {event.title}
              </div>
            ))}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="bg-white dark:bg-gray-950 rounded-md">
        <div className="grid grid-cols-7">{header}</div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Days of week header
    const days: Date[] = [];
    let day = weekStart;

    while (day <= weekEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="bg-white dark:bg-gray-950 rounded-md">
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 font-medium text-center text-xs md:text-base">Time</div>
          {days.map((day) => (
            <div key={day.toString()} className={cn("p-0.5 md:p-2 text-xs md:text-base font-medium text-center", isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-950")}>
              {format(day, "EEE")}
              <br />
              {format(day, "MMM d")}
            </div>
          ))}
        </div>

        <div className="h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[60px] dark:border-gray-800">
              <div className="p-1 text-xs text-right border-r dark:border-gray-800">{hour.toString().padStart(2, "0")}:00</div>

              {days.map((day) => {
                const hourEvents = filteredEvents.filter((event) => isSameDay(event.start, day) && new Date(event.start).getHours() === hour);

                return (
                  <div key={day.toString()} className="p-1 relative">
                    {hourEvents.map((event) => (
                      <div key={event.id} onClick={() => handleEventClick(event)} className={cn("text-xs p-1 mb-1 rounded truncate cursor-pointer text-white", eventCategories.find((cat) => cat.id === event.categoryId)?.color)}>
                        {format(event.start, "HH:mm")} - {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-gray-950 rounded-md">
        <div className="grid grid-cols-2 border-b">
          <div className="p-2 font-medium text-center">Time</div>
          <div className={cn("p-2 font-medium text-center", isSameDay(currentDate, new Date()) && "bg-blue-50 dark:bg-blue-950")}>
            {format(currentDate, "EEEE")}
            <br />
            {format(currentDate, "MMMM d, yyyy")}
          </div>
        </div>

        <div className="h-[600px] overflow-y-auto">
          {hours.map((hour) => {
            const hourEvents = filteredEvents.filter((event) => isSameDay(event.start, currentDate) && new Date(event.start).getHours() === hour);

            return (
              <div key={hour} className="grid grid-cols-2 border-b min-h-[60px] dark:border-gray-800">
                <div className="p-1 text-xs text-right border-r dark:border-gray-800">{hour.toString().padStart(2, "0")}:00</div>
                <div className="p-1">
                  {hourEvents.map((event) => (
                    <div key={event.id} onClick={() => handleEventClick(event)} className={cn("text-xs p-1 mb-1 rounded cursor-pointer text-white", eventCategories.find((cat) => cat.id === event.categoryId)?.color)}>
                      {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
                      <br />
                      {event.title}
                      <br />
                      <span className="text-xs opacity-80">{event.location}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderListView = () => {
    // Group events by date
    const eventsByDate = filteredEvents.reduce((acc: any, event) => {
      const dateKey = format(event.start, "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort();

    return (
      <div className="bg-white dark:bg-gray-950 rounded-md">
        {sortedDates.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No events to display. Try adjusting your filters or adding new events.</div>
        ) : (
          sortedDates.map((dateKey) => {
            const date = new Date(dateKey);
            return (
              <div key={dateKey} className="border-b last:border-b-0">
                <div className={cn("p-2 font-medium bg-gray-50 dark:bg-gray-900", isSameDay(date, new Date()) && "bg-blue-50 dark:bg-blue-950")}>{format(date, "EEEE, MMMM d, yyyy")}</div>
                <div className="divide-y">
                  {eventsByDate[dateKey]
                    .sort((a: any, b: any) => a.start.getTime() - b.start.getTime())
                    .map((event: any) => {
                      const category = eventCategories.find((cat) => cat.id === event.categoryId);
                      return (
                        <div key={event.id} onClick={() => handleEventClick(event)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="font-medium">{event.title}</div>
                            <Badge className={cn("text-white", category?.color)}>{category?.name}</Badge>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
                          </div>
                          {event.location && <div className="text-sm mt-1">Location: {event.location}</div>}
                          {event.description && <div className="text-sm text-gray-600 mt-1">{event.description}</div>}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center gap-3 flex-wrap mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Calendar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => setIsAddEventOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3">
              <h3 className="font-medium mb-2">Event Categories</h3>
              <div className="space-y-2">
                {eventCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox id={`category-${category.id}`} checked={selectedCategories.includes(category.id)} onCheckedChange={() => handleCategoryToggle(category.id)} />
                    <label htmlFor={`category-${category.id}`} className="text-sm flex items-center cursor-pointer">
                      <div className={cn("w-3 h-3 rounded-full mr-2", category.color)}></div>
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card>
        <Tabs value={activeView} onValueChange={setActiveView} className="w-auto">
          <CardHeader className="pb-3">
            <div className="flex justify-between gap-3 flex-wrap items-center">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={navigateToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                  {activeView === "month" && format(currentDate, "MMMM yyyy")}
                  {activeView === "week" && `Week of ${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
                  {activeView === "day" && format(currentDate, "MMMM d, yyyy")}
                  {activeView === "list" && "Event List"}
                </h2>
              </div>
              <TabsList>
                <TabsTrigger value="month">
                  <Grid className="h-4 w-4 mr-1" /> Month
                </TabsTrigger>
                <TabsTrigger value="week">
                  <Calendar className="h-4 w-4 mr-1" /> Week
                </TabsTrigger>
                <TabsTrigger value="day">
                  <Clock className="h-4 w-4 mr-1" /> Day
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-1" /> List
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="month" className="mt-0">
              {renderMonthView()}
            </TabsContent>
            <TabsContent value="week" className="mt-0">
              {renderWeekView()}
            </TabsContent>
            <TabsContent value="day" className="mt-0">
              {renderDayView()}
            </TabsContent>
            <TabsContent value="list" className="mt-0">
              {renderListView()}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Add Event Modal */}
      <AddEventModal isOpen={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} onAddEvent={handleAddEvent} categories={eventCategories} selectedDate={currentDate} />

      {/* Edit Event Modal */}
      {selectedEvent && (
        <EditEventModal
          isOpen={isEditEventOpen}
          onClose={() => {
            setIsEditEventOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onUpdateEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          categories={eventCategories}
        />
      )}
    </div>
  );
}
