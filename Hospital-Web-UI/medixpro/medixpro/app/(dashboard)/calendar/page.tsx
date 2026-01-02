"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths, addWeeks, subWeeks, addMinutes, differenceInMinutes, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Filter, Plus, List, Grid, Clock, Calendar, Ban, Settings2, Video, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddEventModal } from "@/components/calendar/add-event-modal";
import { EditEventModal } from "@/components/calendar/edit-event-modal";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import { useToastNotification } from "@/hooks/use-toast-notification";
import axiosClient from "@/lib/axiosClient";
import { getTasks } from "@/lib/tasksApi";

// Event categories with their colors (matching requirements)
const eventCategories = [
  { id: "opd_appointment", name: "OPD Appointment", color: "bg-blue-500 dark:bg-blue-600", editable: false },
  { id: "holiday", name: "Holiday", color: "bg-red-500 dark:bg-red-600", editable: false },
  { id: "leave", name: "Leave", color: "bg-pink-500 dark:bg-pink-600", editable: false },
  { id: "meeting", name: "Meeting", color: "bg-purple-500 dark:bg-purple-600", editable: true },
  { id: "task", name: "Task", color: "bg-orange-500 dark:bg-orange-600", editable: false },
  { id: "reminder", name: "Reminder", color: "bg-yellow-500 dark:bg-yellow-600", editable: true },
  { id: "personal", name: "Personal", color: "bg-gray-500 dark:bg-gray-600", editable: true },
  { id: "time_block", name: "Time Block", color: "bg-slate-400 dark:bg-slate-700", editable: true },
];

// Appointment status types
const appointmentStatuses = [
  { id: "scheduled", name: "Scheduled", color: "bg-blue-500", dot: "bg-blue-500" },
  { id: "checked_in", name: "Checked In", color: "bg-green-500", dot: "bg-green-500" },
  { id: "completed", name: "Completed", color: "bg-gray-500", dot: "bg-gray-500" },
  { id: "no_show", name: "No Show", color: "bg-red-500", dot: "bg-red-500" },
];

// Appointment types
const appointmentTypes = [
  { id: "opd", name: "OPD", icon: Phone },
  { id: "online", name: "Online", icon: Video },
];

// Sample OPD appointments data (read-only)
const sampleOPDAppointments = [
  {
    id: "apt-1",
    title: "Rahul Patil",
    patientInitials: "RP",
    start: new Date(new Date().setHours(9, 0, 0, 0)),
    end: new Date(new Date().setHours(9, 15, 0, 0)),
    categoryId: "opd_appointment",
    appointmentType: "opd",
    status: "scheduled",
    visitType: "Follow-up",
    description: "Follow-up appointment for diabetes management",
    location: "Examination Room 3",
  },
  {
    id: "apt-2",
    title: "Priya Sharma",
    patientInitials: "PS",
    start: new Date(new Date().setHours(9, 10, 0, 0)),
    end: new Date(new Date().setHours(9, 20, 0, 0)),
    categoryId: "opd_appointment",
    appointmentType: "opd",
    status: "checked_in",
    visitType: "New Patient",
    description: "Initial consultation",
    location: "Examination Room 1",
  },
  {
    id: "apt-3",
    title: "Amit Kumar",
    patientInitials: "AK",
    start: new Date(new Date().setHours(9, 15, 0, 0)),
    end: new Date(new Date().setHours(9, 25, 0, 0)),
    categoryId: "opd_appointment",
    appointmentType: "opd",
    status: "scheduled",
    visitType: "Consultation",
    description: "General health checkup",
    location: "Examination Room 2",
  },
  {
    id: "apt-4",
    title: "Sneha Desai",
    patientInitials: "SD",
    start: new Date(new Date().setHours(10, 0, 0, 0)),
    end: new Date(new Date().setHours(10, 15, 0, 0)),
    categoryId: "opd_appointment",
    appointmentType: "online",
    status: "scheduled",
    visitType: "Follow-up",
    description: "Telemedicine consultation",
    location: "Online",
  },
  {
    id: "apt-5",
    title: "Vikram Singh",
    patientInitials: "VS",
    start: new Date(new Date().setHours(11, 0, 0, 0)),
    end: new Date(new Date().setHours(11, 10, 0, 0)),
    categoryId: "opd_appointment",
    appointmentType: "opd",
    status: "completed",
    visitType: "Follow-up",
    description: "Post-surgery follow-up",
    location: "Examination Room 3",
  },
];

// Events will be fetched from the database - no hardcoded events

// Default task duration in minutes (30 minutes)
const DEFAULT_TASK_DURATION_MINUTES = 30

export default function CalendarPage() {
  const { role, user } = useAuth();
  const router = useRouter();
  const toast = useToastNotification();
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dayViewScrollRef = useRef<HTMLDivElement | null>(null);

  // Redirect if not a doctor
  useEffect(() => {
    if (role && role.toLowerCase() !== "doctor") {
      router.push("/dashboard");
    }
  }, [role, router]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]); // Initialize as empty array - will be populated from database
  const [tasks, setTasks] = useState<any[]>([]); // Tasks from database
  const [leaves, setLeaves] = useState<any[]>([]); // Leaves from database
  const [holidays, setHolidays] = useState<any[]>([]); // Holidays from database
  const [opdAppointments] = useState(sampleOPDAppointments);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [activeView, setActiveView] = useState("day"); // Day view as default
  const [selectedCategories, setSelectedCategories] = useState<string[]>(eventCategories.map((cat) => cat.id));
  const [selectedAppointmentTypes, setSelectedAppointmentTypes] = useState<string[]>(appointmentTypes.map((type) => type.id));
  const [selectedAppointmentStatuses, setSelectedAppointmentStatuses] = useState<string[]>(appointmentStatuses.map((status) => status.id));
  const [density, setDensity] = useState<"dense" | "normal" | "compact">("normal"); // 10, 15, 30 min
  const [workingHours, setWorkingHours] = useState({ start: 9, end: 21 }); // 9 AM to 9 PM
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // Calculate slot duration based on density
  const slotDuration = useMemo(() => {
    switch (density) {
      case "dense":
        return 10;
      case "normal":
        return 15;
      case "compact":
        return 30;
      default:
        return 15;
    }
  }, [density]);

  // Helper function to transform task to calendar event format
  const transformTaskToEvent = useCallback((task: any) => {
    if (!task.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    if (isNaN(dueDate.getTime())) {
      console.error("Invalid due date in task:", task);
      return null;
    }
    
    // Use the actual datetime from the task
    const startDate = new Date(dueDate);
    
    // Set end time based on default task duration (30 minutes by default)
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + DEFAULT_TASK_DURATION_MINUTES);
    
    return {
      id: `task-${task.id}`,
      title: task.title,
      categoryId: "task",
      start: startDate,
      end: endDate,
      location: "",
      description: task.description || "",
      taskStatus: task.status, // Store task status for display
      taskPriority: task.priority, // Store task priority for display
      taskId: task.id, // Store original task ID
      assignedTo: task.assignedTo,
    };
  }, []);

  // Fetch tasks from backend
  const fetchTasksRef = useRef(false);
  const fetchTasks = useCallback(async () => {
    if (!role || role.toLowerCase() !== "doctor") return;
    if (fetchTasksRef.current) return;
    
    fetchTasksRef.current = true;
    setIsLoadingTasks(true);
    try {
      const response = await getTasks();
      
      if (response.success && response.results) {
        // Transform tasks to calendar events
        const transformedTasks = response.results
          .map(transformTaskToEvent)
          .filter((task: any) => task !== null);
        
        setTasks(transformedTasks);
        console.log(`Loaded ${transformedTasks.length} tasks from database`);
      } else {
        setTasks([]);
        console.log("No tasks found in database");
      }
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
      if (error.response?.status !== 401) {
        toast.error("Failed to load tasks");
      }
    } finally {
      setIsLoadingTasks(false);
      fetchTasksRef.current = false;
    }
  }, [role, transformTaskToEvent, toast]);

  // Fetch tasks on component mount
  useEffect(() => {
    if (role && role.toLowerCase() === "doctor") {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Helper function to transform leave to calendar event format
  const transformLeaveToEvent = useCallback((leave: any) => {
    console.log("Transforming leave:", leave);
    
    // Handle different possible field names from backend
    const startDateStr = leave.start_date || leave.startDate;
    const endDateStr = leave.end_date || leave.endDate;
    
    if (!startDateStr || !endDateStr) {
      console.error("Missing dates in leave:", leave);
      return null;
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Invalid date in leave:", leave, "start:", startDateStr, "end:", endDateStr);
      return null;
    }
    
    // Set leave as all-day event (start at 00:00, end at 23:59)
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0);
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    // Format leave type for display
    const leaveTypeMap: Record<string, string> = {
      sick: "Sick Leave",
      vacation: "Vacation",
      emergency: "Emergency Leave",
      other: "Leave",
    };
    
    const leaveType = leave.leave_type || leave.leaveType || "other";
    const leaveTypeName = leaveTypeMap[leaveType] || "Leave";
    const halfDay = leave.half_day || leave.halfDay || false;
    const title = halfDay ? `${leaveTypeName} (Half Day)` : leaveTypeName;
    
    // Get clinic name - handle different response formats
    // Backend returns clinic as UUID, not nested object, so we can't get name directly
    const clinicName = leave.clinic?.name || leave.clinic_name || (leave.clinic ? "Clinic" : "");
    
    return {
      id: `leave-${leave.id}`,
      title: title,
      categoryId: "leave",
      start: startDateTime,
      end: endDateTime,
      location: clinicName,
      description: leave.reason || "",
      leaveType: leaveType,
      halfDay: halfDay,
      approved: leave.approved !== undefined ? leave.approved : false,
      leaveId: leave.id,
    };
  }, []);

  // Fetch leaves from backend
  const fetchLeavesRef = useRef(false);
  const fetchLeaves = useCallback(async () => {
    if (!role || role.toLowerCase() !== "doctor") return;
    if (!user?.user_id) return; // Need user_id to fetch leaves
    if (fetchLeavesRef.current) return;
    
    fetchLeavesRef.current = true;
    setIsLoadingLeaves(true);
    try {
      // First, get doctor profile to get doctor_id and clinics
      const profileResponse = await axiosClient.get("/doctor/profile/");
      const profile = profileResponse.data?.doctor_profile || profileResponse.data;
      const doctorId = profile?.personal_info?.id || profile?.id || user.user_id;
      const clinics = profile?.clinic_association || [];
      
      console.log("Fetching leaves - Doctor ID:", doctorId, "Clinics:", clinics);
      
      if (!doctorId || clinics.length === 0) {
        console.log("No doctor ID or clinics found, skipping leaves fetch");
        console.log("Profile data:", profile);
        setLeaves([]);
        return;
      }
      
      // Fetch leaves - try for each clinic, or fetch all if no clinics
      let allLeaves: any[] = [];
      
      if (clinics.length > 0) {
        // Fetch leaves for each clinic
        const leavePromises = clinics.map(async (clinic: any) => {
          const clinicId = clinic.id || clinic.clinic?.id;
          if (!clinicId) {
            console.warn("Clinic ID not found for clinic:", clinic);
            return [];
          }
          
          try {
            console.log(`Fetching leaves for clinic ${clinicId} with doctor ${doctorId}`);
            // Use /doctor/leaves/ since axiosClient already has /api as baseURL
            const response = await axiosClient.get("/doctor/leaves/", {
              params: {
                doctor_id: doctorId,
                clinic_id: clinicId,
              },
            });
            
            console.log(`Leaves API response for clinic ${clinicId}:`, response.data);
            
            if (response.data && response.data.status === "success" && response.data.data) {
              const leavesData = Array.isArray(response.data.data) ? response.data.data : [];
              console.log(`Found ${leavesData.length} leaves for clinic ${clinicId}:`, leavesData);
              return leavesData;
            }
            return [];
          } catch (error: any) {
            console.error(`Error fetching leaves for clinic ${clinicId}:`, error);
            console.error("Error details:", error.response?.data);
            return [];
          }
        });
        
        const allLeavesArrays = await Promise.all(leavePromises);
        allLeaves = allLeavesArrays.flat();
      } else {
        // No clinics found, try fetching all leaves for the doctor
        try {
          console.log(`No clinics found, trying to fetch all leaves for doctor ${doctorId}`);
          const response = await axiosClient.get("/doctor/leaves/", {
            params: {
              doctor_id: doctorId,
            },
          });
          
          console.log("Leaves API response (all leaves):", response.data);
          
          if (response.data && response.data.status === "success" && response.data.data) {
            allLeaves = Array.isArray(response.data.data) ? response.data.data : [];
            console.log(`Found ${allLeaves.length} leaves:`, allLeaves);
          }
        } catch (error: any) {
          console.error("Error fetching all leaves:", error);
          console.error("Error details:", error.response?.data);
        }
      }
      
      // Remove duplicates based on leave ID
      const uniqueLeaves = allLeaves.filter((leave: any, index: number, self: any[]) => 
        index === self.findIndex((l: any) => l.id === leave.id)
      );
      
      console.log("All leaves fetched:", uniqueLeaves);
      
      // Transform leaves to calendar events
      const transformedLeaves = uniqueLeaves
        .map(transformLeaveToEvent)
        .filter((leave: any) => leave !== null);
      
      console.log("Transformed leaves:", transformedLeaves);
      setLeaves(transformedLeaves);
      console.log(`Loaded ${transformedLeaves.length} leaves from database`);
    } catch (error: any) {
      console.error("Error fetching leaves:", error);
      console.error("Error details:", error.response?.data);
      setLeaves([]);
      if (error.response?.status !== 401) {
        toast.error("Failed to load leaves");
      }
    } finally {
      setIsLoadingLeaves(false);
      fetchLeavesRef.current = false;
    }
  }, [role, user, transformLeaveToEvent, toast]);

  // Fetch leaves on component mount
  useEffect(() => {
    if (role && role.toLowerCase() === "doctor" && user?.user_id) {
      fetchLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.user_id]);

  // Helper function to transform holiday to calendar event format
  const transformHolidayToEvent = useCallback((holiday: any) => {
    console.log("Transforming holiday:", holiday);
    
    // Handle different possible field names from backend
    const startDateStr = holiday.start_date || holiday.startDate;
    const endDateStr = holiday.end_date || holiday.endDate;
    
    if (!startDateStr || !endDateStr) {
      console.error("Missing dates in holiday:", holiday);
      return null;
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Invalid date in holiday:", holiday, "start:", startDateStr, "end:", endDateStr);
      return null;
    }
    
    const isFullDay = holiday.is_full_day !== false; // Default to true
    const startTime = holiday.start_time;
    const endTime = holiday.end_time;
    
    let startDateTime: Date;
    let endDateTime: Date;
    
    if (isFullDay) {
      // Full day holiday - set as all-day event (start at 00:00, end at 23:59)
      startDateTime = new Date(startDate);
      startDateTime.setHours(0, 0, 0, 0);
      
      endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
    } else {
      // Partial day holiday - use specific times
      startDateTime = new Date(startDate);
      if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        startDateTime.setHours(hours, minutes, 0, 0);
      } else {
        startDateTime.setHours(0, 0, 0, 0);
      }
      
      endDateTime = new Date(endDate);
      if (endTime) {
        const [hours, minutes] = endTime.split(':').map(Number);
        endDateTime.setHours(hours, minutes, 0, 0);
      } else {
        endDateTime.setHours(23, 59, 59, 999);
      }
    }
    
    // Get clinic name - handle different response formats
    const clinicName = holiday.clinic?.name || holiday.clinic_name || (holiday.clinic ? "Clinic" : "");
    
    return {
      id: `holiday-${holiday.id}`,
      title: holiday.title || "Holiday",
      categoryId: "holiday",
      start: startDateTime,
      end: endDateTime,
      location: clinicName,
      description: holiday.description || "",
      isFullDay: isFullDay,
      isActive: holiday.is_active !== false,
      isApproved: holiday.is_approved !== false,
      holidayId: holiday.id,
    };
  }, []);

  // Fetch holidays from backend
  const fetchHolidaysRef = useRef(false);
  const fetchHolidays = useCallback(async () => {
    if (!role || role.toLowerCase() !== "doctor") return;
    if (!user?.user_id) return; // Need user_id to fetch holidays
    if (fetchHolidaysRef.current) return;
    
    fetchHolidaysRef.current = true;
    setIsLoadingHolidays(true);
    try {
      // First, get doctor profile to get clinics
      const profileResponse = await axiosClient.get("/doctor/profile/");
      const profile = profileResponse.data?.doctor_profile || profileResponse.data;
      const clinics = profile?.clinic_association || [];
      
      console.log("Fetching holidays - Clinics:", clinics);
      
      if (clinics.length === 0) {
        console.log("No clinics found, skipping holidays fetch");
        setHolidays([]);
        return;
      }
      
      // Fetch holidays for each clinic
      const holidayPromises = clinics.map(async (clinic: any) => {
        const clinicId = clinic.id || clinic.clinic?.id;
        if (!clinicId) {
          console.warn("Clinic ID not found for clinic:", clinic);
          return [];
        }
        
        try {
          console.log(`Fetching holidays for clinic ${clinicId}`);
          // Use /clinic/holidays/ since axiosClient already has /api as baseURL
          const response = await axiosClient.get("/clinic/holidays/", {
            params: {
              clinic_id: clinicId,
              is_active: "true", // Only fetch active holidays
            },
          });
          
          console.log(`Holidays API response for clinic ${clinicId}:`, response.data);
          
          if (response.data && response.data.status === "success" && response.data.data) {
            const holidaysData = Array.isArray(response.data.data) ? response.data.data : [];
            console.log(`Found ${holidaysData.length} holidays for clinic ${clinicId}:`, holidaysData);
            return holidaysData;
          }
          return [];
        } catch (error: any) {
          console.error(`Error fetching holidays for clinic ${clinicId}:`, error);
          console.error("Error details:", error.response?.data);
          return [];
        }
      });
      
      const allHolidaysArrays = await Promise.all(holidayPromises);
      const allHolidays = allHolidaysArrays.flat();
      
      // Remove duplicates based on holiday ID
      const uniqueHolidays = allHolidays.filter((holiday: any, index: number, self: any[]) => 
        index === self.findIndex((h: any) => h.id === holiday.id)
      );
      
      console.log("All holidays fetched:", uniqueHolidays);
      
      // Transform holidays to calendar events
      const transformedHolidays = uniqueHolidays
        .map(transformHolidayToEvent)
        .filter((holiday: any) => holiday !== null);
      
      console.log("Transformed holidays:", transformedHolidays);
      setHolidays(transformedHolidays);
      console.log(`Loaded ${transformedHolidays.length} holidays from database`);
    } catch (error: any) {
      console.error("Error fetching holidays:", error);
      console.error("Error details:", error.response?.data);
      setHolidays([]);
      if (error.response?.status !== 401) {
        toast.error("Failed to load holidays");
      }
    } finally {
      setIsLoadingHolidays(false);
      fetchHolidaysRef.current = false;
    }
  }, [role, user, transformHolidayToEvent, toast]);

  // Fetch holidays on component mount
  useEffect(() => {
    if (role && role.toLowerCase() === "doctor" && user?.user_id) {
      fetchHolidays();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.user_id]);

  // Combine all events (OPD appointments + calendar events + tasks + leaves + holidays)
  const allEvents = useMemo(() => {
    const combined = [...opdAppointments, ...events, ...tasks, ...leaves, ...holidays];
    console.log("All events (OPD + Calendar + Tasks + Leaves + Holidays):", combined.length, "OPD:", opdAppointments.length, "Calendar:", events.length, "Tasks:", tasks.length, "Leaves:", leaves.length, "Holidays:", holidays.length);
    return combined;
  }, [opdAppointments, events, tasks, leaves, holidays]);

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    const filtered = allEvents.filter((event) => {
      // Category filter - must be in selected categories
      if (!selectedCategories.includes(event.categoryId)) {
        return false;
      }

      // For OPD appointments, check type and status filters
      if (event.categoryId === "opd_appointment") {
        const appointmentEvent = event as any;
        // Only apply type filter if at least one type is selected
        if (selectedAppointmentTypes.length > 0 && appointmentEvent.appointmentType && !selectedAppointmentTypes.includes(appointmentEvent.appointmentType)) {
          return false;
        }
        // Only apply status filter if at least one status is selected
        if (selectedAppointmentStatuses.length > 0 && appointmentEvent.status && !selectedAppointmentStatuses.includes(appointmentEvent.status)) {
          return false;
        }
      }

      return true;
    });
    
    console.log("Filtered events:", filtered.length, "out of", allEvents.length, "total events");
    console.log("Selected categories:", selectedCategories);
    return filtered;
  }, [allEvents, selectedCategories, selectedAppointmentTypes, selectedAppointmentStatuses]);

  // Navigation functions
  const navigatePrevious = useCallback(() => {
    if (activeView === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (activeView === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else if (activeView === "day") {
      setCurrentDate(subDays(currentDate, 1));
    }
  }, [activeView, currentDate]);

  const navigateNext = useCallback(() => {
    if (activeView === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (activeView === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (activeView === "day") {
      setCurrentDate(addDays(currentDate, 1));
    }
  }, [activeView, currentDate]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
    // Auto-scroll will be handled by the useEffect when currentDate changes
  }, []);

  // Helper function to map frontend category to backend category
  const mapCategoryToBackend = useCallback((frontendCategory: string): string => {
    const categoryMap: Record<string, string> = {
      meeting: "MEETING",
      reminder: "REMINDER",
      personal: "PERSONAL",
      time_block: "PERSONAL", // Time blocks are stored as PERSONAL with is_blocking=true
    };
    return categoryMap[frontendCategory] || "PERSONAL";
  }, []);

  // Helper function to map backend category to frontend category
  const mapCategoryToFrontend = useCallback((backendCategory: string, isBlocking: boolean): string => {
    if (isBlocking && backendCategory === "PERSONAL") {
      return "time_block";
    }
    const categoryMap: Record<string, string> = {
      MEETING: "meeting",
      REMINDER: "reminder",
      PERSONAL: "personal",
      HOLIDAY: "holiday",
    };
    return categoryMap[backendCategory] || "personal";
  }, []);

  // Helper function to transform backend event to frontend format
  const transformBackendEventToFrontend = useCallback((backendEvent: any) => {
    // Parse dates - handle both ISO string and Date objects
    const startDate = backendEvent.start_datetime 
      ? new Date(backendEvent.start_datetime) 
      : new Date();
    const endDate = backendEvent.end_datetime 
      ? new Date(backendEvent.end_datetime) 
      : new Date();
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Invalid date in event:", backendEvent);
      return null;
    }
    
    return {
      id: backendEvent.id,
      title: backendEvent.title || "Untitled Event",
      categoryId: mapCategoryToFrontend(backendEvent.category, backendEvent.is_blocking || false),
      start: startDate,
      end: endDate,
      location: backendEvent.location || "",
      description: backendEvent.description || "",
      reminderTime: backendEvent.reminder_minutes || undefined,
    };
  }, [mapCategoryToFrontend]);

  // Fetch events from backend
  const fetchEventsRef = useRef(false); // Track if fetch is in progress
  const fetchEvents = useCallback(async () => {
    if (!role || role.toLowerCase() !== "doctor") return;
    if (fetchEventsRef.current) return; // Prevent multiple simultaneous fetches
    
    fetchEventsRef.current = true;
    setIsLoadingEvents(true);
    try {
      // Use /calendar/events/ since axiosClient already has /api as baseURL
      const response = await axiosClient.get("/calendar/events/", {
        params: {
          is_active: "true",
          page_size: 100, // Get all active events
        },
      });

      console.log("Calendar events API response:", response.data);
      
      if (response.data && response.data.status === "success" && response.data.data) {
        // Backend returns: { status: "success", data: { events: [...], pagination: {...} } }
        const eventsData = response.data.data.events || [];
        console.log("Raw events data from API:", eventsData);
        
        if (Array.isArray(eventsData) && eventsData.length > 0) {
          // Transform events and filter out any null values (invalid dates)
          const transformedEvents = eventsData
            .map(transformBackendEventToFrontend)
            .filter((event: any) => event !== null);
          
          console.log("Transformed events:", transformedEvents);
          setEvents(transformedEvents);
          console.log(`Loaded ${transformedEvents.length} calendar events from database`);
        } else {
          // No events in database - set empty array
          setEvents([]);
          console.log("No calendar events found in database");
        }
      } else {
        // Unexpected response format - set empty array
        console.warn("Unexpected response format from calendar events API:", response.data);
        setEvents([]);
      }
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      // Set empty array on error to clear any stale data
      setEvents([]);
      // Don't show error toast on initial load, just log it
      if (error.response?.status !== 401) {
        toast.error("Failed to load calendar events");
      }
    } finally {
      setIsLoadingEvents(false);
      fetchEventsRef.current = false;
    }
  }, [role, transformBackendEventToFrontend]);

  // Fetch events on component mount and when role changes
  useEffect(() => {
    if (role && role.toLowerCase() === "doctor") {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]); // Only depend on role, not fetchEvents to prevent infinite loop

  // Event handlers
  const handleAddEvent = useCallback(async (newEvent: any) => {
    setIsCreatingEvent(true);
    try {
      // Map frontend format to backend format
      const backendCategory = mapCategoryToBackend(newEvent.categoryId);
      const isBlocking = newEvent.categoryId === "time_block";
      
      const requestBody = {
        title: newEvent.title,
        category: backendCategory,
        start_datetime: newEvent.start.toISOString(),
        end_datetime: newEvent.end.toISOString(),
        location: newEvent.location || null,
        description: newEvent.description || null,
        is_blocking: isBlocking,
        reminder_minutes: newEvent.reminderTime ? parseInt(newEvent.reminderTime) : null,
      };

      // Use /calendar/events/ since axiosClient already has /api as baseURL
      const response = await axiosClient.post("/calendar/events/", requestBody);

      if (response.data && response.data.status === "success") {
        // Transform backend response to frontend format and add to events
        const backendEvent = response.data.data;
        const frontendEvent = transformBackendEventToFrontend(backendEvent);
        
        setEvents((prevEvents) => [...prevEvents, frontendEvent]);
        setIsAddEventOpen(false);
        toast.success("Event added successfully");
      } else {
        throw new Error(response.data?.message || "Failed to create event");
      }
    } catch (error: any) {
      console.error("Error creating calendar event:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to create event";
      toast.error(errorMessage);
    } finally {
      setIsCreatingEvent(false);
    }
  }, [mapCategoryToBackend, transformBackendEventToFrontend, toast]);

  const handleEditEvent = useCallback((updatedEvent: any) => {
    // Don't allow editing OPD appointments
    if (updatedEvent.categoryId === "opd_appointment") {
      toast.error("OPD appointments cannot be edited");
      return;
    }

    setEvents((prevEvents) => prevEvents.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)));
    setIsEditEventOpen(false);
    setSelectedEvent(null);
    toast.success("Event updated successfully");
  }, [toast]);

  const handleDeleteEvent = useCallback((eventId: string) => {
    const eventToDelete = allEvents.find((e) => e.id === eventId);
    if (eventToDelete?.categoryId === "opd_appointment") {
      toast.error("OPD appointments cannot be deleted");
      return;
    }

    setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
    setIsEditEventOpen(false);
    setSelectedEvent(null);
    toast.success("Event deleted successfully");
  }, [allEvents, toast]);

  const handleEventClick = useCallback((event: any) => {
    setSelectedEvent(event);
    
    // OPD appointments navigate to appointment detail page
    if (event.categoryId === "opd_appointment") {
      // Extract appointment ID (remove 'apt-' prefix if present)
      const appointmentId = event.id.replace('apt-', '');
      router.push(`/appointments/${appointmentId}`);
      return;
    }
    
    // Tasks navigate to tasks page
    if (event.categoryId === "task" && event.taskId) {
      router.push(`/tasks`);
      return;
    }
    
    // Leaves and holidays are read-only - just show info, don't navigate
    if (event.categoryId === "leave" || event.categoryId === "holiday") {
      // Could show a detail modal or just do nothing
      return;
    }
    
    // Time blocks are editable but have special handling
    if (event.categoryId === "time_block") {
      setIsEditEventOpen(true);
      return;
    }
    
    // Other events open edit modal
    setIsEditEventOpen(true);
  }, [router]);

  const handleCategoryToggle = useCallback((categoryId: string, checked?: boolean) => {
    setSelectedCategories((prev) => {
      // If checked is provided (from Checkbox), use it directly
      if (checked !== undefined) {
        if (checked) {
          return prev.includes(categoryId) ? prev : [...prev, categoryId];
        } else {
          return prev.filter((id) => id !== categoryId);
        }
      }
      // Otherwise toggle (for backward compatibility)
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  }, []);

  // Get current time indicator position
  const getCurrentTimePosition = useCallback(() => {
    if (!isSameDay(currentDate, new Date())) return null;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours * 60 + minutes; // Position in minutes from midnight
  }, [currentDate]);

  // Generate time slots for day/week view
  const generateTimeSlots = useCallback(() => {
    const slots: number[] = [];
    const startMinutes = workingHours.start * 60;
    const endMinutes = workingHours.end * 60;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      slots.push(minutes);
    }
    
    return slots;
  }, [workingHours, slotDuration]);

  // Get events for a specific time slot
  const getEventsForSlot = useCallback((slotMinutes: number, date: Date) => {
    const slotStart = new Date(date);
    slotStart.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
    const slotEnd = addMinutes(slotStart, slotDuration);

    return filteredEvents.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if event overlaps with slot
      return (
        (eventStart < slotEnd && eventEnd > slotStart) ||
        isWithinInterval(eventStart, { start: slotStart, end: slotEnd }) ||
        isWithinInterval(eventEnd, { start: slotStart, end: slotEnd })
      );
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [filteredEvents, slotDuration]);

  // Render appointment card
  const renderAppointmentCard = useCallback((event: any, isCompact: boolean = false) => {
    const status = appointmentStatuses.find((s) => s.id === event.status);
    const appointmentType = appointmentTypes.find((t) => t.id === event.appointmentType);
    const TypeIcon = appointmentType?.icon || Phone;

    if (isCompact) {
      return (
        <div
          key={event.id}
          onClick={() => handleEventClick(event)}
          className={cn(
            "text-xs p-1 mb-0.5 rounded cursor-pointer text-white flex items-center gap-1",
            eventCategories.find((cat) => cat.id === event.categoryId)?.color
          )}
          title={`${event.title} - ${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`}
        >
          <div className={cn("w-1.5 h-1.5 rounded-full", status?.dot)}></div>
          <TypeIcon className="h-2.5 w-2.5" />
          <span className="truncate">{event.patientInitials || event.title}</span>
        </div>
      );
    }

    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event)}
        className={cn(
          "text-xs p-2 mb-1 rounded cursor-pointer text-white",
          eventCategories.find((cat) => cat.id === event.categoryId)?.color
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", status?.dot)}></div>
            <TypeIcon className="h-3 w-3" />
          </div>
          <span className="font-medium">{event.patientInitials || event.title}</span>
        </div>
        <div className="text-xs opacity-90">
          {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
        </div>
        {event.visitType && (
          <div className="text-xs opacity-75 mt-0.5">{event.visitType}</div>
        )}
      </div>
    );
  }, [handleEventClick]);

  // Render detailed appointment card for Day View
  const renderDetailedAppointmentCard = useCallback((event: any) => {
    const status = appointmentStatuses.find((s) => s.id === event.status);
    const appointmentType = appointmentTypes.find((t) => t.id === event.appointmentType);
    const TypeIcon = appointmentType?.icon || Phone;

    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event)}
        className={cn(
          "p-2.5 mb-2 rounded-lg cursor-pointer border-l-4 shadow-sm hover:shadow-md transition-shadow",
          "bg-blue-50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-600",
          status?.id === "checked_in" && "bg-green-50 dark:bg-green-950/30 border-green-500",
          status?.id === "completed" && "bg-gray-100 dark:bg-gray-800 border-gray-400",
          status?.id === "no_show" && "bg-red-50 dark:bg-red-950/30 border-red-500"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", status?.dot)}></div>
            <TypeIcon className={cn("h-4 w-4 flex-shrink-0", 
              event.appointmentType === "online" ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
            )} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {event.title}
              </div>
              {event.patientInitials && event.patientInitials !== event.title && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ({event.patientInitials})
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs flex-shrink-0",
              status?.id === "scheduled" && "border-blue-500 text-blue-700 dark:text-blue-400",
              status?.id === "checked_in" && "border-green-500 text-green-700 dark:text-green-400",
              status?.id === "completed" && "border-gray-500 text-gray-700 dark:text-gray-400",
              status?.id === "no_show" && "border-red-500 text-red-700 dark:text-red-400"
            )}
          >
            {status?.name}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="font-medium">{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}</span>
          </div>
          {event.visitType && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Type:</span>
              <span>{event.visitType}</span>
            </div>
          )}
        </div>
        
        {event.location && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    );
  }, [handleEventClick]);

  // Render detailed event card for Day View (non-OPD events)
  const renderDetailedEventCard = useCallback((event: any) => {
    const category = eventCategories.find((cat) => cat.id === event.categoryId);
    const duration = differenceInMinutes(event.end, event.start);

    return (
      <div
        key={event.id}
        onClick={() => handleEventClick(event)}
        className={cn(
          "p-2.5 mb-2 rounded-lg cursor-pointer border-l-4 shadow-sm hover:shadow-md transition-shadow",
          category?.id === "holiday" && "bg-red-50 dark:bg-red-950/30 border-red-500",
          category?.id === "leave" && "bg-pink-50 dark:bg-pink-950/30 border-pink-500",
          category?.id === "meeting" && "bg-purple-50 dark:bg-purple-950/30 border-purple-500",
          category?.id === "task" && "bg-orange-50 dark:bg-orange-950/30 border-orange-500",
          category?.id === "reminder" && "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-500",
          category?.id === "personal" && "bg-gray-50 dark:bg-gray-800 border-gray-400",
          category?.id === "time_block" && "bg-slate-100 dark:bg-slate-800 border-slate-400 opacity-75"
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("w-3 h-3 rounded-full flex-shrink-0", category?.color)}></div>
            {event.categoryId === "time_block" && (
              <Ban className="h-4 w-4 flex-shrink-0 text-slate-600 dark:text-slate-400" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {event.title}
              </div>
              {event.categoryId === "time_block" && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Not Available
                </div>
              )}
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs flex-shrink-0",
              category?.id === "holiday" && "border-red-500 text-red-700 dark:text-red-400",
              category?.id === "leave" && "border-pink-500 text-pink-700 dark:text-pink-400",
              category?.id === "meeting" && "border-purple-500 text-purple-700 dark:text-purple-400",
              category?.id === "task" && "border-orange-500 text-orange-700 dark:text-orange-400",
              category?.id === "reminder" && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
              category?.id === "personal" && "border-gray-500 text-gray-700 dark:text-gray-400",
              category?.id === "time_block" && "border-slate-500 text-slate-700 dark:text-slate-400"
            )}
          >
            {category?.name}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400 mt-2">
          {event.categoryId === "leave" || event.categoryId === "holiday" ? (
            <>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="font-medium">
                  {format(event.start, "MMM d")} - {format(event.end, "MMM d, yyyy")}
                </span>
              </div>
              {event.categoryId === "leave" && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Type:</span>
                  <span className="capitalize">{event.leaveType || "Leave"}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}</span>
              </div>
              {event.categoryId === "task" ? (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Priority:</span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      event.taskPriority === "high" && "border-red-500 text-red-700 dark:text-red-400",
                      event.taskPriority === "medium" && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                      event.taskPriority === "low" && "border-gray-500 text-gray-700 dark:text-gray-400"
                    )}
                  >
                    {event.taskPriority?.toUpperCase() || "MEDIUM"}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Duration:</span>
                  <span>{duration} min</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {event.categoryId === "leave" && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status:</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                event.approved ? "border-green-500 text-green-700 dark:text-green-400" : "border-yellow-500 text-yellow-700 dark:text-yellow-400"
              )}
            >
              {event.approved ? "APPROVED" : "PENDING"}
            </Badge>
            {event.halfDay && (
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400">
                HALF DAY
              </Badge>
            )}
          </div>
        )}
        
        {event.categoryId === "task" && event.taskStatus && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Status:</span>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                event.taskStatus === "done" && "border-green-500 text-green-700 dark:text-green-400",
                event.taskStatus === "in_progress" && "border-blue-500 text-blue-700 dark:text-blue-400",
                event.taskStatus === "todo" && "border-gray-500 text-gray-700 dark:text-gray-400"
              )}
            >
              {event.taskStatus === "done" ? "DONE" : event.taskStatus === "in_progress" ? "IN PROGRESS" : "TO DO"}
            </Badge>
          </div>
        )}
        
        {event.location && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        {event.description && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 line-clamp-2">
            {event.description}
          </div>
        )}
      </div>
    );
  }, [handleEventClick]);

  // Render Day View
  const renderDayView = useMemo(() => {
    const timeSlots = generateTimeSlots();
    const currentTimePos = getCurrentTimePosition();
    
    // Get all events for the day
    const dayAppointments = filteredEvents.filter(
      (event) => isSameDay(event.start, currentDate) && event.categoryId === "opd_appointment"
    );
    const dayOtherEvents = filteredEvents.filter(
      (event) => isSameDay(event.start, currentDate) && event.categoryId !== "opd_appointment"
    );
    const appointmentCount = dayAppointments.length;
    const otherEventCount = dayOtherEvents.length;

    return (
      <div className="bg-white dark:bg-gray-950 rounded-md border">
        {/* Summary Header */}
        <div className="border-b bg-gray-50 dark:bg-gray-900 p-3">
          <div className="flex items-center justify-between">
            <div className={cn("p-2 font-medium text-center", isSameDay(currentDate, new Date()) && "bg-blue-50 dark:bg-blue-950")}>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {format(currentDate, "EEEE, MMMM d, yyyy")}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{appointmentCount}</span> OPD Appointment{appointmentCount !== 1 ? "s" : ""}
              </div>
              {otherEventCount > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">{otherEventCount}</span> Other Event{otherEventCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[100px_1fr] border-b sticky top-0 bg-white dark:bg-gray-950 z-10 shadow-sm">
          <div className="p-2 font-medium text-center border-r text-sm">Time</div>
          <div className="p-2 font-medium text-center text-sm">Appointments & Events</div>
        </div>

        <div 
          ref={dayViewScrollRef}
          className="h-[calc(100vh-350px)] overflow-y-auto relative"
        >
          {timeSlots.map((slotMinutes) => {
            const hour = Math.floor(slotMinutes / 60);
            const minute = slotMinutes % 60;
            const slotTime = new Date(currentDate);
            slotTime.setHours(hour, minute, 0, 0);
            const slotEvents = getEventsForSlot(slotMinutes, currentDate);
            const isCurrentSlot = currentTimePos !== null && 
              slotMinutes <= currentTimePos && 
              currentTimePos < slotMinutes + slotDuration;
            
            // Separate OPD appointments from other events
            const slotAppointments = slotEvents.filter(e => e.categoryId === "opd_appointment");
            const otherEvents = slotEvents.filter(e => e.categoryId !== "opd_appointment");

            return (
              <div 
                key={slotMinutes} 
                id={isCurrentSlot ? "current-time-slot" : undefined}
                data-slot={slotMinutes}
                className="grid grid-cols-[100px_1fr] border-b min-h-[80px] dark:border-gray-800 relative hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
              >
                <div className="p-2 text-sm text-right border-r dark:border-gray-800 flex items-start justify-end pt-3 font-medium text-gray-700 dark:text-gray-300">
                  {format(slotTime, "h:mm a")}
                </div>
                <div className="p-2 relative">
                  {/* Current time indicator */}
                  {isCurrentSlot && (
                    <div
                      className="absolute left-0 right-0 h-1 bg-red-500 z-20"
                      style={{
                        top: `${((currentTimePos! - slotMinutes) / slotDuration) * 100}%`,
                      }}
                    >
                      <div className="absolute -left-2 -top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                  )}
                  
                  {/* Render OPD appointments */}
                  {slotAppointments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {slotAppointments.map((event) => renderDetailedAppointmentCard(event))}
                    </div>
                  )}
                  
                  {/* Render other events */}
                  {otherEvents.length > 0 && (
                    <div className="space-y-2">
                      {otherEvents.map((event) => renderDetailedEventCard(event))}
                    </div>
                  )}
                  
                  {/* Show count if too many events */}
                  {(slotAppointments.length > 3 || otherEvents.length > 3) && (
                    <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {slotAppointments.length > 3 && (
                        <span>+{slotAppointments.length - 3} more appointment{slotAppointments.length - 3 !== 1 ? "s" : ""}</span>
                      )}
                      {slotAppointments.length > 3 && otherEvents.length > 3 && <span> • </span>}
                      {otherEvents.length > 3 && (
                        <span>+{otherEvents.length - 3} more event{otherEvents.length - 3 !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [currentDate, generateTimeSlots, getCurrentTimePosition, getEventsForSlot, renderDetailedAppointmentCard, renderDetailedEventCard, handleEventClick, filteredEvents]);

  // Render Week View
  const renderWeekView = useMemo(() => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const timeSlots = generateTimeSlots();
    const days: Date[] = [];
    let day = weekStart;

    while (day <= weekEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="bg-white dark:bg-gray-950 rounded-md border">
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b sticky top-0 bg-white dark:bg-gray-950 z-10">
          <div className="p-2 font-medium text-center text-xs md:text-base border-r">Time</div>
          {days.map((day) => (
            <div key={day.toString()} className={cn("p-1 md:p-2 text-xs md:text-base font-medium text-center", isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-950")}>
              {format(day, "EEE")}
              <br />
              {format(day, "MMM d")}
            </div>
          ))}
        </div>

        <div className="h-[calc(100vh-300px)] overflow-y-auto">
          {timeSlots.map((slotMinutes) => {
            const hour = Math.floor(slotMinutes / 60);
            const minute = slotMinutes % 60;
            const slotTime = new Date();
            slotTime.setHours(hour, minute, 0, 0);

            return (
              <div key={slotMinutes} className="grid grid-cols-[80px_repeat(7,1fr)] border-b min-h-[60px] dark:border-gray-800">
                <div className="p-1 text-xs text-right border-r dark:border-gray-800 flex items-start justify-end pt-2">
                  {format(slotTime, "HH:mm")}
                </div>

                {days.map((day) => {
                  const slotEvents = getEventsForSlot(slotMinutes, day);

                  return (
                    <div key={day.toString()} className="p-1 relative">
                      {slotEvents.length > 0 && (
                        <div className="space-y-0.5">
                          {slotEvents.slice(0, 2).map((event) => {
                            if (event.categoryId === "opd_appointment") {
                              return renderAppointmentCard(event, true);
                            }
                            return (
                              <div
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className={cn(
                                  "text-xs p-1 mb-0.5 rounded cursor-pointer text-white truncate",
                                  eventCategories.find((cat) => cat.id === event.categoryId)?.color
                                )}
                              >
                                {(event as any).patientInitials || event.title}
                              </div>
                            );
                          })}
                          {slotEvents.length > 2 && (
                            <div className="text-xs p-0.5 text-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              +{slotEvents.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [currentDate, generateTimeSlots, getEventsForSlot, renderAppointmentCard, handleEventClick]);

  // Render Month View
  const renderMonthView = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;

    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const header = daysOfWeek.map((dayName) => (
      <div key={dayName} className="text-center font-medium py-2 border-b">
        {dayName}
      </div>
    ));

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const dayEvents = filteredEvents.filter((event) => isSameDay(event.start, cloneDay));
        const appointmentCount = dayEvents.filter((e) => e.categoryId === "opd_appointment").length;

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "h-32 border p-1 overflow-y-auto cursor-pointer",
              !isSameMonth(day, monthStart) && "text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-gray-900",
              isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
            )}
            onClick={() => {
              setCurrentDate(cloneDay);
              setActiveView("day");
            }}
          >
            <div className="font-medium text-right mb-1">{formattedDate}</div>
            {appointmentCount > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                {appointmentCount} appointment{appointmentCount > 1 ? "s" : ""}
              </div>
            )}
            {dayEvents.slice(0, 2).map((event) => {
              if (event.categoryId === "opd_appointment") {
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEventClick(event);
                    }}
                    className="text-xs p-0.5 mb-0.5 rounded truncate cursor-pointer bg-blue-500 text-white"
                  >
                    {format(event.start, "HH:mm")} - {(event as any).patientInitials || event.title}
                  </div>
                );
              }
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event);
                  }}
                  className={cn(
                    "text-xs p-0.5 mb-0.5 rounded truncate cursor-pointer text-white",
                    eventCategories.find((cat) => cat.id === event.categoryId)?.color
                  )}
                >
                  {format(event.start, "HH:mm")} - {event.title}
                </div>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                +{dayEvents.length - 2} more
              </div>
            )}
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
      <div className="bg-white dark:bg-gray-950 rounded-md border">
        <div className="grid grid-cols-7">{header}</div>
        {rows}
      </div>
    );
  }, [currentDate, filteredEvents, handleEventClick]);

  // Set up appointment reminder notifications
  useEffect(() => {
    if (notificationIntervalRef.current) {
      clearInterval(notificationIntervalRef.current);
    }

    notificationIntervalRef.current = setInterval(() => {
      const now = new Date();
      const upcomingAppointments = opdAppointments.filter((apt) => {
        const timeUntil = differenceInMinutes(apt.start, now);
        return timeUntil > 0 && timeUntil <= 10 && isSameDay(apt.start, now);
      });

      upcomingAppointments.forEach((apt) => {
        const timeUntil = differenceInMinutes(apt.start, now);
        if (timeUntil === 10) {
          toast.info(`Next OPD appointment in 10 minutes: ${apt.title} at ${format(apt.start, "HH:mm")}`);
        }
      });
    }, 60000); // Check every minute

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [opdAppointments, toast]);

  // Auto-scroll to current time in Day View (IST timezone)
  useEffect(() => {
    if (activeView === "day" && isSameDay(currentDate, new Date()) && dayViewScrollRef.current) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const scrollContainer = dayViewScrollRef.current;
        if (!scrollContainer) return;

        // Get current time in IST (Indian Standard Time - UTC+5:30)
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentMinutes = currentHour * 60 + currentMinute;

        // Try to find the current time slot element
        const currentSlot = scrollContainer.querySelector("#current-time-slot");
        if (currentSlot) {
          currentSlot.scrollIntoView({ 
            behavior: "smooth", 
            block: "center",
            inline: "nearest"
          });
        } else {
          // If current time slot not found, find the closest slot
          const timeSlots = generateTimeSlots();
          const closestSlot = timeSlots.find(slot => slot >= currentMinutes) || timeSlots[Math.floor(timeSlots.length / 2)];
          
          if (closestSlot !== undefined) {
            const slotElement = scrollContainer.querySelector(`[data-slot="${closestSlot}"]`);
            if (slotElement) {
              slotElement.scrollIntoView({ 
                behavior: "smooth", 
                block: "center",
                inline: "nearest"
              });
            } else {
              // Fallback: scroll to approximate position based on time
              const startMinutes = workingHours.start * 60;
              const totalMinutes = workingHours.end * 60 - startMinutes;
              const elapsedMinutes = Math.max(0, currentMinutes - startMinutes);
              const scrollPercentage = Math.max(0, Math.min(1, elapsedMinutes / totalMinutes));
              scrollContainer.scrollTop = scrollContainer.scrollHeight * scrollPercentage - scrollContainer.clientHeight / 2;
            }
          }
        }
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [activeView, currentDate, generateTimeSlots, workingHours]);

  // Don't render if not a doctor
  if (role && role.toLowerCase() !== "doctor") {
    return null;
  }

  // Get editable categories (exclude OPD appointments)
  const editableCategories = eventCategories.filter((cat) => cat.editable);

  return (
    <div className="container mx-auto p-4 md:p-6">
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
            <PopoverContent className="w-80 p-4">
              <h3 className="font-medium mb-3">Event Categories</h3>
              <div className="space-y-2 mb-4">
                {eventCategories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategories.includes(category.id)}
                      onCheckedChange={(checked) => handleCategoryToggle(category.id, checked as boolean)}
                    />
                    <label htmlFor={`category-${category.id}`} className="text-sm flex items-center cursor-pointer">
                      <div className={cn("w-3 h-3 rounded-full mr-2", category.color)}></div>
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>

              <h3 className="font-medium mb-3">Appointment Type</h3>
              <div className="space-y-2 mb-4">
                {appointmentTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.id}`}
                      checked={selectedAppointmentTypes.includes(type.id)}
                      onCheckedChange={(checked) => {
                        setSelectedAppointmentTypes((prev) =>
                          checked
                            ? (prev.includes(type.id) ? prev : [...prev, type.id])
                            : prev.filter((id) => id !== type.id)
                        );
                      }}
                    />
                    <label htmlFor={`type-${type.id}`} className="text-sm cursor-pointer">
                      {type.name}
                    </label>
                  </div>
                ))}
              </div>

              <h3 className="font-medium mb-3">Appointment Status</h3>
              <div className="space-y-2">
                {appointmentStatuses.map((status) => (
                  <div key={status.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status.id}`}
                      checked={selectedAppointmentStatuses.includes(status.id)}
                      onCheckedChange={(checked) => {
                        setSelectedAppointmentStatuses((prev) =>
                          checked
                            ? (prev.includes(status.id) ? prev : [...prev, status.id])
                            : prev.filter((id) => id !== status.id)
                        );
                      }}
                    />
                    <label htmlFor={`status-${status.id}`} className="text-sm cursor-pointer">
                      {status.name}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="h-4 w-4 mr-1" />
                Density
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3">
              <h3 className="font-medium mb-2">Time Slot Density</h3>
              <Select value={density} onValueChange={(value: "dense" | "normal" | "compact") => setDensity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dense">Dense (10 min)</SelectItem>
                  <SelectItem value="normal">Normal (15 min)</SelectItem>
                  <SelectItem value="compact">Compact (30 min)</SelectItem>
                </SelectContent>
              </Select>
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
                  {activeView === "week" &&
                    `Week of ${format(startOfWeek(currentDate), "MMM d")} - ${format(endOfWeek(currentDate), "MMM d, yyyy")}`}
                  {activeView === "day" && format(currentDate, "MMMM d, yyyy")}
                </h2>
              </div>
              <TabsList>
                <TabsTrigger value="day">
                  <Clock className="h-4 w-4 mr-1" /> Day
                </TabsTrigger>
                <TabsTrigger value="week">
                  <Calendar className="h-4 w-4 mr-1" /> Week
                </TabsTrigger>
                <TabsTrigger value="month">
                  <Grid className="h-4 w-4 mr-1" /> Month
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="day" className="mt-0">
              {renderDayView}
            </TabsContent>
            <TabsContent value="week" className="mt-0">
              {renderWeekView}
            </TabsContent>
            <TabsContent value="month" className="mt-0">
              {renderMonthView}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddEventOpen}
        onClose={() => setIsAddEventOpen(false)}
        onAddEvent={handleAddEvent}
        categories={editableCategories}
        selectedDate={currentDate}
      />

      {/* Edit Event Modal */}
      {selectedEvent && selectedEvent.categoryId !== "opd_appointment" && (
        <EditEventModal
          isOpen={isEditEventOpen}
          onClose={() => {
            setIsEditEventOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onUpdateEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
          categories={editableCategories}
        />
      )}
    </div>
  );
}

