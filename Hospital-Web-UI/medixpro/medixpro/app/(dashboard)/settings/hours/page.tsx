"use client"
import { ArrowLeft, Plus, Trash2, Clock, Calendar as CalendarIcon, Coffee, Briefcase, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { cn } from "@/lib/utils";
import { SimpleFormCard } from "@/components/doctor/profile/shared/simple-form-card";

// Types
interface Session {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface DaySchedule {
  day: string;
  morning: Session;
  evening: Session;
  night: Session;
}

interface BreakTime {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface SpecialHour {
  id: string;
  date: Date;
  session: string;
  startTime: string;
  endTime: string;
}

interface Holiday {
  id: string;
  date: Date;
  reason: string;
}

interface Leave {
  id: string;
  fromDate: Date;
  toDate: Date;
  leaveType: string;
  halfDay: string;
  reason: string;
}

// Helper function to generate time options
const generateTimeOptions = (startHour: number = 0, endHour: number = 23) => {
  const options = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time24 = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? "AM" : "PM";
      const displayTime = `${hour12}:${minute.toString().padStart(2, "0")} ${ampm}`;
      options.push({ value: time24, label: displayTime });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

// Data transformation helpers
const transformBackendToFrontendAvailability = (backendData: any): DaySchedule[] => {
  if (!backendData || !Array.isArray(backendData)) {
    // Return default schedule
    return [
      { day: "Monday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
      { day: "Tuesday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
      { day: "Wednesday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
      { day: "Thursday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
      { day: "Friday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
      { day: "Saturday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: false, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
      { day: "Sunday", morning: { enabled: false, startTime: "09:00", endTime: "13:00" }, evening: { enabled: false, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    ];
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return days.map((dayName) => {
    const dayData = backendData.find((d: any) => d.day === dayName) || { day: dayName };
    return {
      day: dayName,
      morning: {
        enabled: dayData.morning?.enabled || false,
        startTime: dayData.morning?.start || "09:00",
        endTime: dayData.morning?.end || "13:00",
      },
      evening: {
        enabled: dayData.evening?.enabled || false,
        startTime: dayData.evening?.start || "17:00",
        endTime: dayData.evening?.end || "21:00",
      },
      night: {
        enabled: dayData.night?.enabled || false,
        startTime: dayData.night?.start || "21:00",
        endTime: dayData.night?.end || "23:00",
      },
    };
  });
};

const transformFrontendToBackendAvailability = (frontendData: DaySchedule[], breaks?: BreakTime[]): any[] => {
  const breaksData = breaks ? transformFrontendToBackendBreaks(breaks) : [];
  
  return frontendData.map((day) => ({
    day: day.day,
    is_working: day.morning.enabled || day.evening.enabled || day.night.enabled,
    morning: day.morning.enabled
      ? {
          enabled: true,
          start: day.morning.startTime,
          end: day.morning.endTime,
        }
      : null,
    evening: day.evening.enabled
      ? {
          enabled: true,
          start: day.evening.startTime,
          end: day.evening.endTime,
        }
      : null,
    night: day.night.enabled
      ? {
          enabled: true,
          start: day.night.startTime,
          end: day.night.endTime,
        }
      : null,
    breaks: (day.morning.enabled || day.evening.enabled || day.night.enabled) ? breaksData : [],
  }));
};

const transformBackendToFrontendBreaks = (backendData: any): BreakTime[] => {
  if (!backendData || !Array.isArray(backendData)) return [];
  return backendData.map((breakItem: any, index: number) => ({
    id: breakItem.id || `break-${index}`,
    name: breakItem.name || `Break ${index + 1}`,
    startTime: breakItem.start || breakItem.startTime || "12:00",
    endTime: breakItem.end || breakItem.endTime || "13:00",
  }));
};

const transformFrontendToBackendBreaks = (frontendData: BreakTime[]): any[] => {
  // Filter out invalid breaks and ensure all required fields are present
  return frontendData
    .filter((breakItem) => {
      // Only include breaks that have name, startTime, and endTime
      return breakItem.name && breakItem.name.trim() !== "" && 
             breakItem.startTime && breakItem.endTime &&
             breakItem.startTime < breakItem.endTime;
    })
    .map((breakItem) => ({
      name: breakItem.name.trim() || `Break ${Date.now()}`,
      start: breakItem.startTime,
      end: breakItem.endTime,
    }));
};

const transformBackendToFrontendLeaves = (backendData: any[]): Leave[] => {
  if (!backendData || !Array.isArray(backendData)) return [];
  return backendData.map((leave: any) => ({
    id: leave.id || leave.pk || Date.now().toString(),
    fromDate: leave.start_date ? new Date(leave.start_date) : new Date(),
    toDate: leave.end_date ? new Date(leave.end_date) : new Date(),
    leaveType: leave.leave_type || "vacation",
    // Convert boolean to string: true -> "morning" (default), false -> "no"
    // Note: Backend only stores boolean, so we default to "morning" for half days
    halfDay: leave.half_day === true ? "morning" : "no",
    reason: leave.reason || "",
  }));
};

const transformFrontendToBackendLeave = (frontendData: Leave): any => {
  // Convert half_day from string ("no", "morning", "evening") to boolean
  // Backend expects boolean: true if half day, false if full day
  const isHalfDay = frontendData.halfDay !== "no" && frontendData.halfDay !== "";
  
  return {
    start_date: frontendData.fromDate.toISOString().split("T")[0],
    end_date: frontendData.toDate.toISOString().split("T")[0],
    leave_type: frontendData.leaveType,
    half_day: isHalfDay,
    reason: frontendData.reason || "",
  };
};

const transformBackendToFrontendSchedulingRules = (backendData: any) => {
  if (!backendData) {
    return {
      allowSameDay: true,
      allowConcurrent: false,
      maxConcurrent: 1,
      requireApprovalNewPatients: false,
      allowReschedule: true,
      rescheduleCutoffHours: 6,
      allowCancellation: true,
      cancellationCutoffHours: 4,
      autoConfirm: true,
      allowEmergencyWalkIn: true,
      advanceBookingDays: 14,
    };
  }
  return {
    allowSameDay: backendData.allow_same_day_appointments ?? true,
    allowConcurrent: backendData.allow_concurrent_appointments ?? false,
    maxConcurrent: backendData.max_concurrent_appointments ?? 1,
    requireApprovalNewPatients: backendData.require_approval_for_new_patients ?? false,
    allowReschedule: backendData.allow_patient_rescheduling ?? true,
    rescheduleCutoffHours: backendData.reschedule_cutoff_hours ?? 6,
    allowCancellation: backendData.allow_patient_cancellation ?? true,
    cancellationCutoffHours: backendData.cancellation_cutoff_hours ?? 4,
    autoConfirm: backendData.auto_confirm_appointments ?? true,
    allowEmergencyWalkIn: backendData.allow_emergency_slots ?? true,
    advanceBookingDays: backendData.advance_booking_days ?? 14,
  };
};

const transformFrontendToBackendSchedulingRules = (frontendData: any) => {
  return {
    allow_same_day_appointments: frontendData.allowSameDay,
    allow_concurrent_appointments: frontendData.allowConcurrent,
    max_concurrent_appointments: frontendData.maxConcurrent,
    require_approval_for_new_patients: frontendData.requireApprovalNewPatients,
    allow_patient_rescheduling: frontendData.allowReschedule,
    reschedule_cutoff_hours: frontendData.rescheduleCutoffHours,
    allow_patient_cancellation: frontendData.allowCancellation,
    cancellation_cutoff_hours: frontendData.cancellationCutoffHours,
    auto_confirm_appointments: frontendData.autoConfirm,
    allow_emergency_slots: frontendData.allowEmergencyWalkIn,
    advance_booking_days: frontendData.advanceBookingDays,
  };
};

export default function DoctorWorkingHoursPage() {
  const toast = useToastNotification();
  const isLoadingRef = useRef(false);

  // Clinic/Doctor info (auto-loaded from logged-in user)
  const [clinicId, setClinicId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Weekly schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([
    { day: "Monday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    { day: "Tuesday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    { day: "Wednesday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    { day: "Thursday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    { day: "Friday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: true, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    { day: "Saturday", morning: { enabled: true, startTime: "09:00", endTime: "13:00" }, evening: { enabled: false, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
    { day: "Sunday", morning: { enabled: false, startTime: "09:00", endTime: "13:00" }, evening: { enabled: false, startTime: "17:00", endTime: "21:00" }, night: { enabled: false, startTime: "21:00", endTime: "23:00" } },
  ]);

  const [originalWeeklySchedule, setOriginalWeeklySchedule] = useState<DaySchedule[]>([]);

  // Break times state
  const [breakTimes, setBreakTimes] = useState<BreakTime[]>([
    { id: "1", name: "Lunch Break", startTime: "13:00", endTime: "13:30" },
    { id: "2", name: "Tea Break", startTime: "18:30", endTime: "18:45" },
  ]);
  const [originalBreakTimes, setOriginalBreakTimes] = useState<BreakTime[]>([]);

  // Special hours, holidays, and leaves state
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [originalSpecialHours, setOriginalSpecialHours] = useState<SpecialHour[]>([]);
  const [originalHolidays, setOriginalHolidays] = useState<Holiday[]>([]);
  const [originalLeaves, setOriginalLeaves] = useState<Leave[]>([]);

  // Appointment slot settings
  const [slotDuration, setSlotDuration] = useState("10");
  const [bufferTime, setBufferTime] = useState("5");
  const [maxAppointments, setMaxAppointments] = useState("20");
  const [emergencySlots, setEmergencySlots] = useState("2");
  const [originalSlotSettings, setOriginalSlotSettings] = useState({ slotDuration: "10", bufferTime: "5", maxAppointments: "20", emergencySlots: "2" });

  // Scheduling rules state
  const [schedulingRules, setSchedulingRules] = useState({
    allowSameDay: true,
    allowConcurrent: false,
    maxConcurrent: 1,
    requireApprovalNewPatients: false,
    allowReschedule: true,
    rescheduleCutoffHours: 6,
    allowCancellation: true,
    cancellationCutoffHours: 4,
    autoConfirm: true,
    allowEmergencyWalkIn: true,
    advanceBookingDays: 14,
  });
  const [originalSchedulingRules, setOriginalSchedulingRules] = useState(schedulingRules);
  const [schedulingRuleId, setSchedulingRuleId] = useState<string | null>(null);

  // Edit states for each section
  const [isEditingWeekly, setIsEditingWeekly] = useState(false);
  const [isEditingBreaks, setIsEditingBreaks] = useState(false);
  const [isEditingSpecialHours, setIsEditingSpecialHours] = useState(false);
  const [isEditingSlots, setIsEditingSlots] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);

  // Saving states
  const [isSavingWeekly, setIsSavingWeekly] = useState(false);
  const [isSavingBreaks, setIsSavingBreaks] = useState(false);
  const [isSavingSpecialHours, setIsSavingSpecialHours] = useState(false);
  const [isSavingSlots, setIsSavingSlots] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // Load clinic and doctor info on mount
  useEffect(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    const loadInitialData = async () => {
      try {
        // Get clinic ID from localStorage
        const storedClinicId = localStorage.getItem("clinic_id") || "";
        if (!storedClinicId) {
          // Try to fetch from API
          const token = localStorage.getItem("access_token");
          const response = await fetch("/api/doctor/profile/clinics", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            const clinicsList = data?.data || [];
            if (clinicsList.length > 0) {
              const clinicId = clinicsList[0]?.id || clinicsList[0]?.clinic_id || "";
              setClinicId(clinicId);
              localStorage.setItem("clinic_id", clinicId);
            }
          }
        } else {
          setClinicId(storedClinicId);
        }

        // Get doctor ID from localStorage
        const storedDoctorId = localStorage.getItem("doctor_id") || localStorage.getItem("user_id") || "";
        setDoctorId(storedDoctorId);

        // Load doctor availability data
        await loadDoctorAvailability();
      } catch (error: any) {
        console.error("Failed to load initial data:", error);
        toast.error(error.message || "Failed to load working hours data");
      } finally {
        setIsLoadingData(false);
        isLoadingRef.current = false;
      }
    };

    loadInitialData();

    return () => {
      isLoadingRef.current = false;
    };
  }, []);

  const loadDoctorAvailability = async () => {
    try {
      if (!clinicId) {
        console.warn("No clinic ID available, skipping data load");
        return;
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Load working hours (includes weekly schedule, breaks, and slot settings)
      try {
        const workingHoursResponse = await fetch(
          `/api/doctor/working-hours?clinic_id=${clinicId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (workingHoursResponse.ok) {
          const workingHoursData = await workingHoursResponse.json();
          if (workingHoursData.data) {
            const availability = workingHoursData.data.availability || [];
            const transformedSchedule = transformBackendToFrontendAvailability(availability);
            setWeeklySchedule(transformedSchedule);
            setOriginalWeeklySchedule(JSON.parse(JSON.stringify(transformedSchedule)));

            // Extract breaks from availability data
            // Breaks are stored per day, but we'll collect unique breaks from all days
            // or use breaks from the first day that has breaks
            const breakMap = new Map<string, BreakTime>(); // Use name+times as key to avoid duplicates
            
            availability.forEach((day: any, dayIndex: number) => {
              if (day.breaks && Array.isArray(day.breaks) && day.breaks.length > 0) {
                day.breaks.forEach((breakItem: any, breakIndex: number) => {
                  const breakKey = `${breakItem.name || 'Break'}-${breakItem.start || ''}-${breakItem.end || ''}`;
                  if (!breakMap.has(breakKey)) {
                    breakMap.set(breakKey, {
                      id: `break-${breakMap.size}`,
                      name: breakItem.name || `Break ${breakMap.size + 1}`,
                      startTime: breakItem.start || breakItem.startTime || "12:00",
                      endTime: breakItem.end || breakItem.endTime || "13:00",
                    });
                  }
                });
              }
            });
            
            // Convert map values to array
            const uniqueBreaks = Array.from(breakMap.values());
            if (uniqueBreaks.length > 0) {
              setBreakTimes(uniqueBreaks);
              setOriginalBreakTimes(JSON.parse(JSON.stringify(uniqueBreaks)));
            }

            // Set slot settings
            if (workingHoursData.data.slot_duration) {
              setSlotDuration(String(workingHoursData.data.slot_duration));
            }
            if (workingHoursData.data.buffer_time !== undefined) {
              setBufferTime(String(workingHoursData.data.buffer_time));
            }
            if (workingHoursData.data.max_appointments_per_day) {
              setMaxAppointments(String(workingHoursData.data.max_appointments_per_day));
            }
            if (workingHoursData.data.emergency_slots !== undefined) {
              setEmergencySlots(String(workingHoursData.data.emergency_slots));
            }
            setOriginalSlotSettings({
              slotDuration: String(workingHoursData.data.slot_duration || "10"),
              bufferTime: String(workingHoursData.data.buffer_time || "5"),
              maxAppointments: String(workingHoursData.data.max_appointments_per_day || "20"),
              emergencySlots: String(workingHoursData.data.emergency_slots || "2"),
            });
          }
        }
      } catch (error: any) {
        console.error("Error loading working hours:", error);
        // Continue loading other data even if this fails
      }

      // Load scheduling rules
      try {
        if (doctorId) {
          const rulesResponse = await fetch(
            `/api/doctors/${doctorId}/scheduling-rules?clinic_id=${clinicId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (rulesResponse.ok) {
            const rulesData = await rulesResponse.json();
            if (rulesData.data) {
              // Handle both single object and array responses
              const data = Array.isArray(rulesData.data) ? rulesData.data[0] : rulesData.data;
              if (data) {
                const transformedRules = transformBackendToFrontendSchedulingRules(data);
                setSchedulingRules(transformedRules);
                setOriginalSchedulingRules({ ...transformedRules });
                // Store the ID if available
                if (data.id) {
                  setSchedulingRuleId(data.id);
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error("Error loading scheduling rules:", error);
        // Continue with defaults
      }

      // Load leaves
      try {
        if (doctorId) {
          const leavesResponse = await fetch(
            `/api/doctor/leaves?doctor_id=${doctorId}&clinic_id=${clinicId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (leavesResponse.ok) {
            const leavesData = await leavesResponse.json();
            if (leavesData.data && Array.isArray(leavesData.data)) {
              const transformedLeaves = transformBackendToFrontendLeaves(leavesData.data);
              setLeaves(transformedLeaves);
              setOriginalLeaves(JSON.parse(JSON.stringify(transformedLeaves)));
            }
          }
        }
      } catch (error: any) {
        console.error("Error loading leaves:", error);
        // Continue with empty leaves
      }
    } catch (error: any) {
      console.error("Failed to load doctor availability:", error);
      toast.error(error.message || "Failed to load doctor availability");
    }
  };

  const updateDaySchedule = (dayIndex: number, session: "morning" | "evening" | "night", field: keyof Session, value: any) => {
    const updated = [...weeklySchedule];
    updated[dayIndex][session] = { ...updated[dayIndex][session], [field]: value };
    setWeeklySchedule(updated);
  };

  const addBreakTime = () => {
    setBreakTimes([
      ...breakTimes,
      { id: Date.now().toString(), name: "", startTime: "12:00", endTime: "13:00" },
    ]);
  };

  const removeBreakTime = (id: string) => {
    setBreakTimes(breakTimes.filter((bt) => bt.id !== id));
  };

  const updateBreakTime = (id: string, field: keyof BreakTime, value: any) => {
    setBreakTimes(breakTimes.map((bt) => (bt.id === id ? { ...bt, [field]: value } : bt)));
  };

  const addSpecialHour = () => {
    setSpecialHours([
      ...specialHours,
      { id: Date.now().toString(), date: new Date(), session: "morning", startTime: "10:00", endTime: "14:00" },
    ]);
  };

  const removeSpecialHour = (id: string) => {
    setSpecialHours(specialHours.filter((sh) => sh.id !== id));
  };

  const updateSpecialHour = (id: string, field: keyof SpecialHour, value: any) => {
    setSpecialHours(specialHours.map((sh) => (sh.id === id ? { ...sh, [field]: value } : sh)));
  };

  const addHoliday = () => {
    setHolidays([...holidays, { id: Date.now().toString(), date: new Date(), reason: "" }]);
  };

  const removeHoliday = (id: string) => {
    setHolidays(holidays.filter((h) => h.id !== id));
  };

  const updateHoliday = (id: string, field: keyof Holiday, value: any) => {
    setHolidays(holidays.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };

  const addLeave = () => {
    setLeaves([
      ...leaves,
      { id: Date.now().toString(), fromDate: new Date(), toDate: new Date(), leaveType: "vacation", halfDay: "no", reason: "" },
    ]);
  };

  const removeLeave = (id: string) => {
    setLeaves(leaves.filter((l) => l.id !== id));
  };

  const updateLeave = (id: string, field: keyof Leave, value: any) => {
    setLeaves(leaves.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const getDayAvailabilityStatus = (day: DaySchedule) => {
    const hasAnySession = day.morning.enabled || day.evening.enabled || day.night.enabled;
    if (!hasAnySession) return "unavailable";
    if (day.morning.enabled && day.evening.enabled && day.night.enabled) return "available";
    return "partial";
  };

  // Weekly Schedule handlers
  const handleEditWeekly = () => {
    setOriginalWeeklySchedule(JSON.parse(JSON.stringify(weeklySchedule)));
    setIsEditingWeekly(true);
  };

  const handleCancelWeekly = () => {
    setWeeklySchedule(JSON.parse(JSON.stringify(originalWeeklySchedule)));
    setIsEditingWeekly(false);
  };

  const handleSaveWeekly = async () => {
    setIsSavingWeekly(true);
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Include current breaks when saving weekly schedule to preserve them
      const availability = transformFrontendToBackendAvailability(weeklySchedule, breakTimes);

      const response = await fetch("/api/doctor/working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          availability: availability,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to save weekly working hours";
        const errorDetails = data.errors ? Object.values(data.errors).flat().join(", ") : "";
        throw new Error(errorDetails || errorMessage);
      }

      setOriginalWeeklySchedule(JSON.parse(JSON.stringify(weeklySchedule)));
      setIsEditingWeekly(false);
      toast.success("Weekly working hours updated successfully", { duration: 2500 });
    } catch (error: any) {
      console.error("Error saving weekly schedule:", error);
      toast.error(error.message || "Failed to save weekly working hours");
    } finally {
      setIsSavingWeekly(false);
    }
  };

  // Break Times handlers
  const handleEditBreaks = () => {
    setOriginalBreakTimes(JSON.parse(JSON.stringify(breakTimes)));
    setIsEditingBreaks(true);
  };

  const handleCancelBreaks = () => {
    setBreakTimes(JSON.parse(JSON.stringify(originalBreakTimes)));
    setIsEditingBreaks(false);
  };

  const handleSaveBreaks = async () => {
    setIsSavingBreaks(true);
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Breaks are saved as part of working hours, so we need to update the availability
      // with breaks included in each day
      // Pass breaks to the transform function so they're included in the availability
      const availability = transformFrontendToBackendAvailability(weeklySchedule, breakTimes);

      const response = await fetch("/api/doctor/working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          availability: availability,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Properly extract error messages
        let errorMessage = data.error || data.message || "Failed to save break times";
        
        if (data.errors) {
          if (typeof data.errors === 'object') {
            // Recursively extract error messages from nested objects
            const extractErrors = (errors: any, prefix: string = ""): string[] => {
              const messages: string[] = [];
              
              if (Array.isArray(errors)) {
                errors.forEach((err, idx) => {
                  if (typeof err === 'string') {
                    messages.push(prefix ? `${prefix}[${idx}]: ${err}` : err);
                  } else if (typeof err === 'object') {
                    messages.push(...extractErrors(err, prefix ? `${prefix}[${idx}]` : `[${idx}]`));
                  }
                });
              } else if (typeof errors === 'object') {
                Object.entries(errors).forEach(([key, value]: [string, any]) => {
                  if (Array.isArray(value)) {
                    value.forEach((item, idx) => {
                      if (typeof item === 'string') {
                        messages.push(prefix ? `${prefix}.${key}[${idx}]: ${item}` : `${key}[${idx}]: ${item}`);
                      } else if (typeof item === 'object') {
                        messages.push(...extractErrors(item, prefix ? `${prefix}.${key}[${idx}]` : `${key}[${idx}]`));
                      }
                    });
                  } else if (typeof value === 'string') {
                    messages.push(prefix ? `${prefix}.${key}: ${value}` : `${key}: ${value}`);
                  } else if (typeof value === 'object' && value !== null) {
                    messages.push(...extractErrors(value, prefix ? `${prefix}.${key}` : key));
                  }
                });
              } else if (typeof errors === 'string') {
                messages.push(prefix ? `${prefix}: ${errors}` : errors);
              }
              
              return messages;
            };
            
            const errorDetails = extractErrors(data.errors);
            if (errorDetails.length > 0) {
              errorMessage = errorDetails.join('; ');
            }
          } else {
            errorMessage = String(data.errors);
          }
        }
        
        throw new Error(errorMessage);
      }

      setOriginalBreakTimes(JSON.parse(JSON.stringify(breakTimes)));
      setIsEditingBreaks(false);
      toast.success("Break times updated successfully", { duration: 2500 });
    } catch (error: any) {
      console.error("Error saving break times:", error);
      toast.error(error.message || "Failed to save break times");
    } finally {
      setIsSavingBreaks(false);
    }
  };

  // Special Hours & Holidays handlers
  const handleEditSpecialHours = () => {
    setOriginalSpecialHours(JSON.parse(JSON.stringify(specialHours)));
    setOriginalHolidays(JSON.parse(JSON.stringify(holidays)));
    setOriginalLeaves(JSON.parse(JSON.stringify(leaves)));
    setIsEditingSpecialHours(true);
  };

  const handleCancelSpecialHours = () => {
    setSpecialHours(JSON.parse(JSON.stringify(originalSpecialHours)));
    setHolidays(JSON.parse(JSON.stringify(originalHolidays)));
    setLeaves(JSON.parse(JSON.stringify(originalLeaves)));
    setIsEditingSpecialHours(false);
  };

  const handleSaveSpecialHours = async () => {
    setIsSavingSpecialHours(true);
    try {
      if (!clinicId || !doctorId) {
        throw new Error("Clinic ID and Doctor ID are required");
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Save leaves (create/update/delete)
      const errors: string[] = [];
      // UUIDs are typically 36 characters with dashes, temporary IDs are shorter
      const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const leavesToCreate = leaves.filter((l) => !isUUID(l.id));
      const leavesToUpdate = leaves.filter((l) => isUUID(l.id));

      // Create new leaves
      for (const leave of leavesToCreate) {
        try {
          const leaveData = transformFrontendToBackendLeave(leave);
          
          // Check if a leave with the same dates already exists in originalLeaves
          // If it exists, we'll update it instead of creating a new one
          const existingLeave = originalLeaves.find((l) => 
            l.fromDate.toISOString().split("T")[0] === leaveData.start_date &&
            l.toDate.toISOString().split("T")[0] === leaveData.end_date
          );
          
          let response;
          if (existingLeave && isUUID(existingLeave.id)) {
            // Update existing leave instead of creating duplicate
            response = await fetch(`/api/doctor/leaves/${existingLeave.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(leaveData),
            });
            
            if (response.ok) {
              // Update the leave ID in state to match the existing one
              const data = await response.json();
              if (data.data && data.data.id) {
                setLeaves(leaves.map((l) => 
                  l === leave ? { ...l, id: data.data.id } : l
                ));
              }
              continue; // Skip error handling for successful update
            }
          } else {
            // Create new leave
            response = await fetch("/api/doctor/leaves", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                clinic: clinicId,
                ...leaveData,
              }),
            });
          }

          if (!response.ok) {
            const data = await response.json();
            // Extract detailed error messages
            let errorMsg = data.error || data.message || "Failed to save leave";
            let isUniqueError = false;
            
            if (data.errors) {
              // If there are validation errors, format them
              if (typeof data.errors === 'object') {
                // Handle non_field_errors first (like unique constraint errors)
                if (data.errors.non_field_errors && Array.isArray(data.errors.non_field_errors)) {
                  const nonFieldErrors = data.errors.non_field_errors.join(', ');
                    if (nonFieldErrors.includes("unique") || nonFieldErrors.includes("must make a unique")) {
                    isUniqueError = true;
                    // Try to fetch the existing leave from backend and update it instead
                    try {
                      const fetchResponse = await fetch(
                        `/api/doctor/leaves?doctor_id=${doctorId}&clinic_id=${clinicId}`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );
                      if (fetchResponse.ok) {
                        const fetchData = await fetchResponse.json();
                        if (fetchData.data && Array.isArray(fetchData.data)) {
                          const existingLeaveFromDB = fetchData.data.find((l: any) =>
                            l.start_date === leaveData.start_date &&
                            l.end_date === leaveData.end_date
                          );
                          if (existingLeaveFromDB && existingLeaveFromDB.id) {
                            // Try to update the existing leave
                            const updateResponse = await fetch(`/api/doctor/leaves/${existingLeaveFromDB.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify(leaveData),
                            });
                            
                            if (updateResponse.ok) {
                              // Successfully updated existing leave, update state with the ID
                              setLeaves(leaves.map((l) => 
                                l === leave ? { ...l, id: existingLeaveFromDB.id } : l
                              ));
                              // Don't add to errors - successfully handled
                              continue;
                            } else {
                              // Update failed, get error
                              const updateData = await updateResponse.json();
                              errorMsg = updateData.error || updateData.message || "Failed to update existing leave";
                            }
                          }
                        }
                      }
                    } catch (fetchError) {
                      // If we can't fetch, just show the original error
                    }
                    // Only show error if we couldn't handle it automatically
                    if (errorMsg.includes("unique") || errorMsg.includes("must make a unique")) {
                      errorMsg = "A leave for this date range already exists. Please use a different date range.";
                    }
                  } else {
                    errorMsg = nonFieldErrors;
                  }
                } else {
                  // Handle field-specific errors
                  const errorDetails = Object.entries(data.errors)
                    .filter(([key]) => key !== 'non_field_errors')
                    .map(([key, value]: [string, any]) => {
                      if (Array.isArray(value)) {
                        return `${key}: ${value.join(', ')}`;
                      }
                      return `${key}: ${value}`;
                    })
                    .join('; ');
                  if (errorDetails) {
                    errorMsg = errorDetails;
                  }
                }
              } else {
                errorMsg = String(data.errors);
              }
            }
            // Handle unique constraint error specifically (fallback)
            if (!isUniqueError && (errorMsg.includes("unique") || errorMsg.includes("already exists") || errorMsg.includes("must make a unique"))) {
              errorMsg = "A leave for this date range already exists. Please use a different date range or update the existing leave.";
            }
            errors.push(errorMsg);
          } else {
            // On success, update the leave ID from response
            const data = await response.json();
            if (data.data && data.data.id) {
              // Update the leave in state with the new ID from backend
              setLeaves(leaves.map((l) => 
                l === leave ? { ...l, id: data.data.id } : l
              ));
            }
          }
        } catch (error: any) {
          errors.push(error.message || "Failed to create leave");
        }
      }

      // Update existing leaves
      for (const leave of leavesToUpdate) {
        try {
          const leaveData = transformFrontendToBackendLeave(leave);
          const response = await fetch(`/api/doctor/leaves/${leave.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(leaveData),
          });

          if (!response.ok) {
            const data = await response.json();
            errors.push(data.error || data.message || "Failed to update leave");
          }
        } catch (error: any) {
          errors.push(error.message || "Failed to update leave");
        }
      }

      // Check for deleted leaves (compare with original)
      const originalLeaveIds = new Set(originalLeaves.map((l) => l.id));
      const currentLeaveIds = new Set(leaves.map((l) => l.id));
      const deletedLeaves = originalLeaves.filter((l) => !currentLeaveIds.has(l.id));

      for (const leave of deletedLeaves) {
        try {
          const response = await fetch(`/api/doctor/leaves/${leave.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            let data;
            try {
              data = await response.json();
            } catch (e) {
              // If response is not ok and we can't parse JSON, use status text
              errors.push(`Failed to delete leave: ${response.statusText || "Unknown error"}`);
              continue;
            }
            errors.push(data.error || data.message || "Failed to delete leave");
          }
          // If response is ok (204 No Content), no need to parse JSON - deletion succeeded
        } catch (error: any) {
          errors.push(error.message || "Failed to delete leave");
        }
      }

      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }

      // Note: Special hours and holidays would need separate API endpoints
      // For now, we'll just save leaves
      setOriginalSpecialHours(JSON.parse(JSON.stringify(specialHours)));
      setOriginalHolidays(JSON.parse(JSON.stringify(holidays)));
      setOriginalLeaves(JSON.parse(JSON.stringify(leaves)));
      setIsEditingSpecialHours(false);
      toast.success("Leaves updated successfully", { duration: 2500 });
    } catch (error: any) {
      console.error("Error saving special hours/holidays/leaves:", error);
      toast.error(error.message || "Failed to save special hours, holidays, and leaves");
    } finally {
      setIsSavingSpecialHours(false);
    }
  };

  // Appointment Slot Settings handlers
  const handleEditSlots = () => {
    setOriginalSlotSettings({
      slotDuration,
      bufferTime,
      maxAppointments,
      emergencySlots,
    });
    setIsEditingSlots(true);
  };

  const handleCancelSlots = () => {
    setSlotDuration(originalSlotSettings.slotDuration);
    setBufferTime(originalSlotSettings.bufferTime);
    setMaxAppointments(originalSlotSettings.maxAppointments);
    setEmergencySlots(originalSlotSettings.emergencySlots);
    setIsEditingSlots(false);
  };

  const handleSaveSlots = async () => {
    setIsSavingSlots(true);
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/doctor/working-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinic_id: clinicId,
          slot_duration: parseInt(slotDuration),
          buffer_time: parseInt(bufferTime),
          max_appointments_per_day: parseInt(maxAppointments),
          emergency_slots: parseInt(emergencySlots),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || "Failed to save appointment slot settings";
        const errorDetails = data.errors ? Object.values(data.errors).flat().join(", ") : "";
        throw new Error(errorDetails || errorMessage);
      }

      setOriginalSlotSettings({
        slotDuration,
        bufferTime,
        maxAppointments,
        emergencySlots,
      });
      setIsEditingSlots(false);
      toast.success("Appointment slot settings updated successfully", { duration: 2500 });
    } catch (error: any) {
      console.error("Error saving slot settings:", error);
      toast.error(error.message || "Failed to save appointment slot settings");
    } finally {
      setIsSavingSlots(false);
    }
  };

  // Scheduling Rules handlers
  const handleEditRules = () => {
    setOriginalSchedulingRules({ ...schedulingRules });
    setIsEditingRules(true);
  };

  const handleCancelRules = () => {
    setSchedulingRules({ ...originalSchedulingRules });
    setIsEditingRules(false);
  };

  const handleSaveRules = async () => {
    setIsSavingRules(true);
    try {
      if (!clinicId) {
        throw new Error("Clinic ID is required");
      }

      if (!doctorId) {
        throw new Error("Doctor ID is required");
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const backendRules = transformFrontendToBackendSchedulingRules(schedulingRules);

      // Use UPSERT endpoint that handles both create and update
      const response = await fetch(
        `/api/doctor/scheduling-rules/update?doctor_id=${doctorId}&clinic_id=${clinicId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(backendRules),
        }
      );

      let data;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        throw new Error(`Invalid response from server: ${response.statusText || "Unknown error"}`);
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || data.detail || "Failed to save scheduling rules";
        let errorDetails = "";
        
        if (data.errors) {
          if (typeof data.errors === 'object') {
            // Recursively extract error messages from nested objects
            const extractErrors = (errors: any, prefix: string = ""): string[] => {
              const messages: string[] = [];
              
              if (Array.isArray(errors)) {
                errors.forEach((err, idx) => {
                  if (typeof err === 'string') {
                    messages.push(prefix ? `${prefix}[${idx}]: ${err}` : err);
                  } else if (typeof err === 'object') {
                    messages.push(...extractErrors(err, prefix ? `${prefix}[${idx}]` : `[${idx}]`));
                  }
                });
              } else if (typeof errors === 'object') {
                Object.entries(errors).forEach(([key, value]: [string, any]) => {
                  if (Array.isArray(value)) {
                    value.forEach((item, idx) => {
                      if (typeof item === 'string') {
                        messages.push(prefix ? `${prefix}.${key}[${idx}]: ${item}` : `${key}[${idx}]: ${item}`);
                      } else if (typeof item === 'object') {
                        messages.push(...extractErrors(item, prefix ? `${prefix}.${key}[${idx}]` : `${key}[${idx}]`));
                      }
                    });
                  } else if (typeof value === 'string') {
                    messages.push(prefix ? `${prefix}.${key}: ${value}` : `${key}: ${value}`);
                  } else if (typeof value === 'object' && value !== null) {
                    messages.push(...extractErrors(value, prefix ? `${prefix}.${key}` : key));
                  }
                });
              } else if (typeof errors === 'string') {
                messages.push(prefix ? `${prefix}: ${errors}` : errors);
              }
              
              return messages;
            };
            
            const errorDetailsArray = extractErrors(data.errors);
            if (errorDetailsArray.length > 0) {
              errorDetails = errorDetailsArray.join('; ');
            }
          } else {
            errorDetails = String(data.errors);
          }
        }
        
        throw new Error(errorDetails || errorMessage);
      }

      // Store the ID if returned from the response
      if (data.data && data.data.id) {
        setSchedulingRuleId(data.data.id);
      }

      setOriginalSchedulingRules({ ...schedulingRules });
      setIsEditingRules(false);
      toast.success("Scheduling rules updated successfully", { duration: 2500 });
    } catch (error: any) {
      console.error("Error saving scheduling rules:", error);
      toast.error(error.message || "Failed to save scheduling rules");
    } finally {
      setIsSavingRules(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex items-center space-x-3">
          <Link href="/settings">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Doctor Working Hours</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your availability and schedule</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <div className="text-sm text-muted-foreground">Loading working hours...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/settings">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Doctor Working Hours</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your availability and schedule</p>
          </div>
        </div>
      </div>

      <div className="md:grid max-md:space-y-6 gap-6 md:grid-cols-2">
        {/* Weekly Working Hours */}
        <SimpleFormCard
          title="Weekly Working Hours"
          description="Set doctor's regular operating hours for each day of the week"
          isEditing={isEditingWeekly}
          isSaving={isSavingWeekly}
          onEdit={handleEditWeekly}
          onSave={handleSaveWeekly}
          onCancel={handleCancelWeekly}
        >
          <div className="space-y-5">
            {weeklySchedule.map((day, dayIndex) => {
              const status = getDayAvailabilityStatus(day);
              return (
                <div key={day.day} className="space-y-3 pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={cn(
                          "h-2.5 w-2.5 rounded-full ring-2 ring-offset-2",
                          status === "available" && "bg-green-500 ring-green-200",
                          status === "partial" && "bg-yellow-500 ring-yellow-200",
                          status === "unavailable" && "bg-red-500 ring-red-200"
                        )}
                      />
                      <Label className="font-semibold text-base w-24">{day.day}</Label>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          status === "available" && "border-green-200 text-green-700 bg-green-50",
                          status === "partial" && "border-yellow-200 text-yellow-700 bg-yellow-50",
                          status === "unavailable" && "border-red-200 text-red-700 bg-red-50"
                        )}
                      >
                        {status === "available" ? "Available" : status === "partial" ? "Partial" : "Unavailable"}
                      </Badge>
                    </div>
                  </div>

                  {/* Morning Session */}
                  <div className="flex items-center gap-3 pl-6 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-2.5 w-28 flex-shrink-0">
                      <Switch
                        checked={day.morning.enabled}
                        onCheckedChange={(checked) => updateDaySchedule(dayIndex, "morning", "enabled", checked)}
                        disabled={!isEditingWeekly}
                      />
                      <Label className="text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Morning
                      </Label>
                    </div>
                    {day.morning.enabled ? (
                      <div className="flex flex-1 items-center space-x-2 min-w-0 ml-4">
                        <Select
                          value={day.morning.startTime}
                          onValueChange={(value) => updateDaySchedule(dayIndex, "morning", "startTime", value)}
                          disabled={!isEditingWeekly}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-sm whitespace-nowrap">to</span>
                        <Select
                          value={day.morning.endTime}
                          onValueChange={(value) => updateDaySchedule(dayIndex, "morning", "endTime", value)}
                          disabled={!isEditingWeekly}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm ml-4">OFF</span>
                    )}
                  </div>

                  {/* Evening Session */}
                  <div className="flex items-center gap-3 pl-6 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-2.5 w-28 flex-shrink-0">
                      <Switch
                        checked={day.evening.enabled}
                        onCheckedChange={(checked) => updateDaySchedule(dayIndex, "evening", "enabled", checked)}
                        disabled={!isEditingWeekly}
                      />
                      <Label className="text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Evening
                      </Label>
                    </div>
                    {day.evening.enabled ? (
                      <div className="flex flex-1 items-center space-x-2 min-w-0 ml-4">
                        <Select
                          value={day.evening.startTime}
                          onValueChange={(value) => updateDaySchedule(dayIndex, "evening", "startTime", value)}
                          disabled={!isEditingWeekly}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-sm whitespace-nowrap">to</span>
                        <Select
                          value={day.evening.endTime}
                          onValueChange={(value) => updateDaySchedule(dayIndex, "evening", "endTime", value)}
                          disabled={!isEditingWeekly}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm ml-4">OFF</span>
                    )}
                  </div>

                  {/* Night Session */}
                  <div className="flex items-center gap-3 pl-6 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-2.5 w-28 flex-shrink-0">
                      <Switch
                        checked={day.night.enabled}
                        onCheckedChange={(checked) => updateDaySchedule(dayIndex, "night", "enabled", checked)}
                        disabled={!isEditingWeekly}
                      />
                      <Label className="text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Night
                      </Label>
                    </div>
                    {day.night.enabled ? (
                      <div className="flex flex-1 items-center space-x-2 min-w-0 ml-4">
                        <Select
                          value={day.night.startTime}
                          onValueChange={(value) => updateDaySchedule(dayIndex, "night", "startTime", value)}
                          disabled={!isEditingWeekly}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground text-sm whitespace-nowrap">to</span>
                        <Select
                          value={day.night.endTime}
                          onValueChange={(value) => updateDaySchedule(dayIndex, "night", "endTime", value)}
                          disabled={!isEditingWeekly}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm ml-4">OFF</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </SimpleFormCard>

        <div className="space-y-6">
          {/* Break Times */}
          <SimpleFormCard
            title="Break Times"
            description="Configure daily break times for the doctor"
            isEditing={isEditingBreaks}
            isSaving={isSavingBreaks}
            onEdit={handleEditBreaks}
            onSave={handleSaveBreaks}
            onCancel={handleCancelBreaks}
          >
            <div className="space-y-3">
              {breakTimes.length === 0 && !isEditingBreaks ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coffee className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No break times configured</p>
                </div>
              ) : (
                breakTimes.map((breakTime) => (
                  <div key={breakTime.id} className="flex items-center gap-3 flex-wrap p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-[140px]">
                      <Label className="text-xs text-muted-foreground mb-1.5 block">Break Name</Label>
                      <Input
                        placeholder="e.g. Lunch Break"
                        value={breakTime.name}
                        onChange={(e) => updateBreakTime(breakTime.id, "name", e.target.value)}
                        disabled={!isEditingBreaks}
                        className="h-9"
                      />
                    </div>
                    <div className="flex flex-1 items-end space-x-2 min-w-[200px]">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">Start</Label>
                        <Select
                          value={breakTime.startTime}
                          onValueChange={(value) => updateBreakTime(breakTime.id, "startTime", value)}
                          disabled={!isEditingBreaks}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <span className="text-muted-foreground text-xs pb-2.5">to</span>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1.5 block">End</Label>
                        <Select
                          value={breakTime.endTime}
                          onValueChange={(value) => updateBreakTime(breakTime.id, "endTime", value)}
                          disabled={!isEditingBreaks}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {isEditingBreaks && (
                      <Button variant="ghost" size="icon" onClick={() => removeBreakTime(breakTime.id)} className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
              {isEditingBreaks && (
                <Button variant="outline" size="sm" onClick={addBreakTime} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Break Time
                </Button>
              )}
            </div>
          </SimpleFormCard>

          {/* Special Hours & Holidays (with Leaves as first tab) */}
          <SimpleFormCard
            title="Special Hours, Holidays & Leaves"
            description="Set special operating hours, mark holidays, and manage doctor leaves"
            isEditing={isEditingSpecialHours}
            isSaving={isSavingSpecialHours}
            onEdit={handleEditSpecialHours}
            onSave={handleSaveSpecialHours}
            onCancel={handleCancelSpecialHours}
          >
            <Tabs defaultValue="leaves">
              <TabsList>
                <TabsTrigger value="leaves">Leaves</TabsTrigger>
                <TabsTrigger value="special">Special Hours</TabsTrigger>
                <TabsTrigger value="holidays">Holidays</TabsTrigger>
              </TabsList>
              <TabsContent value="leaves" className="space-y-4 pt-4">
                {leaves.length === 0 && !isEditingSpecialHours ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No leaves scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaves.map((leave) => (
                      <div key={leave.id} className="flex items-end gap-3 flex-wrap p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-[120px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">From Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              disabled={!isEditingSpecialHours}
                            >
                              {leave.fromDate ? leave.fromDate.toDateString() : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={leave.fromDate}
                              onSelect={(date) => updateLeave(leave.id, "fromDate", date || new Date())}
                              disabled={!isEditingSpecialHours}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                        <div className="flex-1 min-w-[120px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">To Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              disabled={!isEditingSpecialHours}
                            >
                              {leave.toDate ? leave.toDate.toDateString() : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={leave.toDate}
                              onSelect={(date) => updateLeave(leave.id, "toDate", date || new Date())}
                              disabled={!isEditingSpecialHours}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                        <div className="flex-1 min-w-[120px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Leave Type</Label>
                        <Select
                          value={leave.leaveType}
                          onValueChange={(value) => updateLeave(leave.id, "leaveType", value)}
                          disabled={!isEditingSpecialHours}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sick">Sick</SelectItem>
                            <SelectItem value="vacation">Vacation</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                        <div className="flex-1 min-w-[120px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Half Day</Label>
                        <Select
                          value={leave.halfDay}
                          onValueChange={(value) => updateLeave(leave.id, "halfDay", value)}
                          disabled={!isEditingSpecialHours}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="evening">Evening</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Reason</Label>
                        <Input
                          placeholder="e.g. Conference"
                          value={leave.reason}
                          onChange={(e) => updateLeave(leave.id, "reason", e.target.value)}
                          disabled={!isEditingSpecialHours}
                        />
                      </div>
                      {isEditingSpecialHours && (
                        <Button variant="ghost" size="icon" onClick={() => removeLeave(leave.id)} className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    ))}
                  </div>
                )}
                {isEditingSpecialHours && (
                  <Button variant="outline" size="sm" onClick={addLeave} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Leave
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="special" className="space-y-4 pt-4">
                {specialHours.length === 0 && !isEditingSpecialHours ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No special hours configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {specialHours.map((specialHour) => (
                      <div key={specialHour.id} className="flex items-end gap-3 flex-wrap p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              disabled={!isEditingSpecialHours}
                            >
                              {specialHour.date ? specialHour.date.toDateString() : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={specialHour.date}
                              onSelect={(date) => updateSpecialHour(specialHour.id, "date", date || new Date())}
                              disabled={!isEditingSpecialHours}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                        <div className="flex-1 min-w-[120px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Session</Label>
                        <Select
                          value={specialHour.session}
                          onValueChange={(value) => updateSpecialHour(specialHour.id, "session", value)}
                          disabled={!isEditingSpecialHours}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="morning">Morning</SelectItem>
                            <SelectItem value="evening">Evening</SelectItem>
                            <SelectItem value="night">Night</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={specialHour.startTime}
                          onChange={(e) => updateSpecialHour(specialHour.id, "startTime", e.target.value)}
                          disabled={!isEditingSpecialHours}
                        />
                      </div>
                      <div className="flex-1 min-w-[100px]">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={specialHour.endTime}
                          onChange={(e) => updateSpecialHour(specialHour.id, "endTime", e.target.value)}
                          disabled={!isEditingSpecialHours}
                        />
                      </div>
                      {isEditingSpecialHours && (
                        <Button variant="ghost" size="icon" onClick={() => removeSpecialHour(specialHour.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    ))}
                  </div>
                )}
                {isEditingSpecialHours && (
                  <Button variant="outline" size="sm" onClick={addSpecialHour} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Special Hours
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="holidays" className="space-y-4 pt-4">
                {holidays.length === 0 && !isEditingSpecialHours ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No holidays configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holidays.map((holiday) => (
                      <div key={holiday.id} className="flex items-end gap-3 flex-wrap p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              disabled={!isEditingSpecialHours}
                            >
                              {holiday.date ? holiday.date.toDateString() : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={holiday.date}
                              onSelect={(date) => updateHoliday(holiday.id, "date", date || new Date())}
                              disabled={!isEditingSpecialHours}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex-1">
                        <Label>Holiday Name</Label>
                        <Input
                          placeholder="e.g. Christmas Day"
                          value={holiday.reason}
                          onChange={(e) => updateHoliday(holiday.id, "reason", e.target.value)}
                          disabled={!isEditingSpecialHours}
                        />
                      </div>
                      {isEditingSpecialHours && (
                        <Button variant="ghost" size="icon" onClick={() => removeHoliday(holiday.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    ))}
                  </div>
                )}
                {isEditingSpecialHours && (
                  <Button variant="outline" size="sm" onClick={addHoliday} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </SimpleFormCard>
        </div>
      </div>

      {/* Appointment Slot Settings */}
      <SimpleFormCard
        title="Appointment Slot Settings"
        description="Configure default appointment duration and scheduling rules"
        isEditing={isEditingSlots}
        isSaving={isSavingSlots}
        onEdit={handleEditSlots}
        onSave={handleSaveSlots}
        onCancel={handleCancelSlots}
      >
        <div className="grid gap-6 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="slot-duration">Slot Duration</Label>
            <Select value={slotDuration} onValueChange={setSlotDuration} disabled={!isEditingSlots}>
              <SelectTrigger id="slot-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="buffer-time">Buffer Time</Label>
            <Select value={bufferTime} onValueChange={setBufferTime} disabled={!isEditingSlots}>
              <SelectTrigger id="buffer-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-appointments">Max Appointments / Day</Label>
            <Input
              id="max-appointments"
              type="number"
              value={maxAppointments}
              onChange={(e) => setMaxAppointments(e.target.value)}
              disabled={!isEditingSlots}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency-slots">Emergency Slots</Label>
            <Input
              id="emergency-slots"
              type="number"
              value={emergencySlots}
              onChange={(e) => setEmergencySlots(e.target.value)}
              disabled={!isEditingSlots}
            />
          </div>
        </div>
      </SimpleFormCard>

      {/* Scheduling Rules */}
      <SimpleFormCard
        title="Scheduling Rules"
        description="Control how appointments are booked for this doctor"
        isEditing={isEditingRules}
        isSaving={isSavingRules}
        onEdit={handleEditRules}
        onSave={handleSaveRules}
        onCancel={handleCancelRules}
      >
        <div className="space-y-6">
          {/* Booking Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Booking Rules
            </h3>
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.allowSameDay}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, allowSameDay: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="allow-same-day" className="font-medium cursor-pointer">
                      Allow same-day appointments
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Patients can book appointments for today if slots are available.
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.allowConcurrent}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, allowConcurrent: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="allow-concurrent" className="font-medium cursor-pointer">
                      Allow concurrent appointments
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Allow more than one patient to be booked in the same time slot.
                  </p>
                  {schedulingRules.allowConcurrent && (
                    <div className="pl-8 pt-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="max-concurrent" className="text-xs text-muted-foreground">
                          Max concurrent appointments per slot:
                        </Label>
                        <Input
                          id="max-concurrent"
                          type="number"
                          min="1"
                          max="10"
                          value={schedulingRules.maxConcurrent}
                          onChange={(e) => setSchedulingRules({ ...schedulingRules, maxConcurrent: parseInt(e.target.value) || 1 })}
                          disabled={!isEditingRules}
                          className="w-20 h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.allowEmergencyWalkIn}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, allowEmergencyWalkIn: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="allow-emergency" className="font-medium cursor-pointer">
                      Allow emergency / walk-in appointments
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Bypasses normal slot limits. Visible only to helpdesk/admin.
                  </p>
                  {schedulingRules.allowEmergencyWalkIn && (
                    <div className="pl-8 pt-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="emergency-slots-rule" className="text-xs text-muted-foreground">
                          Reserved emergency slots per day:
                        </Label>
                        <Input
                          id="emergency-slots-rule"
                          type="number"
                          min="0"
                          max="10"
                          value={emergencySlots}
                          onChange={(e) => setEmergencySlots(e.target.value)}
                          disabled={!isEditingRules}
                          className="w-20 h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="advance-booking-days" className="font-medium">
                      Advance booking allowed up to
                    </Label>
                    <Input
                      id="advance-booking-days"
                      type="number"
                      min="1"
                      max="180"
                      value={schedulingRules.advanceBookingDays}
                      onChange={(e) => setSchedulingRules({ ...schedulingRules, advanceBookingDays: parseInt(e.target.value) || 14 })}
                      disabled={!isEditingRules}
                      className="w-24 h-9"
                    />
                    <Label className="text-sm text-muted-foreground">days</Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Block bookings beyond this limit. Prevents long-term misuse.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Patient Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Patient Actions
            </h3>
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.allowReschedule}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, allowReschedule: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="allow-reschedule" className="font-medium cursor-pointer">
                      Allow patient rescheduling
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Patients can reschedule their appointment before the cutoff time.
                  </p>
                  {schedulingRules.allowReschedule && (
                    <div className="pl-8 pt-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="reschedule-cutoff" className="text-xs text-muted-foreground">
                          Reschedule allowed up to
                        </Label>
                        <Input
                          id="reschedule-cutoff"
                          type="number"
                          min="1"
                          max="48"
                          value={schedulingRules.rescheduleCutoffHours}
                          onChange={(e) => setSchedulingRules({ ...schedulingRules, rescheduleCutoffHours: parseInt(e.target.value) || 6 })}
                          disabled={!isEditingRules}
                          className="w-20 h-8"
                        />
                        <Label className="text-xs text-muted-foreground">hours before appointment</Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.allowCancellation}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, allowCancellation: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="allow-cancellation" className="font-medium cursor-pointer">
                      Allow patient cancellation
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Patients can cancel their appointment. Slot freed automatically.
                  </p>
                  {schedulingRules.allowCancellation && (
                    <div className="pl-8 pt-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="cancellation-cutoff" className="text-xs text-muted-foreground">
                          Cancellation allowed up to
                        </Label>
                        <Input
                          id="cancellation-cutoff"
                          type="number"
                          min="1"
                          max="48"
                          value={schedulingRules.cancellationCutoffHours}
                          onChange={(e) => setSchedulingRules({ ...schedulingRules, cancellationCutoffHours: parseInt(e.target.value) || 4 })}
                          disabled={!isEditingRules}
                          className="w-20 h-8"
                        />
                        <Label className="text-xs text-muted-foreground">hours before appointment</Label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Approval & Confirmation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Approval & Confirmation
            </h3>
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.requireApprovalNewPatients}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, requireApprovalNewPatients: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="require-approval" className="font-medium cursor-pointer">
                      Require approval for new patients
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    New patient appointments must be approved before confirmation. Existing patients bypass approval.
                  </p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedulingRules.autoConfirm}
                      onCheckedChange={(checked) => setSchedulingRules({ ...schedulingRules, autoConfirm: checked })}
                      disabled={!isEditingRules}
                    />
                    <Label htmlFor="auto-confirm" className="font-medium cursor-pointer">
                      Auto-confirm appointments
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Appointments are confirmed immediately after booking. Disable when approval is required.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Priority Rules Info */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Scheduling Priority (Read-only)</Label>
                <p className="text-xs text-muted-foreground">
                  Availability is determined in this order:
                </p>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">1.</span>
                    <span>Doctor Leave</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">2.</span>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">3.</span>
                    <span>Special Hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">4.</span>
                    <span>Weekly Schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">5.</span>
                    <span>Clinic Hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SimpleFormCard>
    </div>
  );
}
