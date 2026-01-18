"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { usePatient } from "@/lib/patientContext";
import { Check, Users, Clock, AlertCircle } from "lucide-react";
import axiosClient from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";

interface QueuePatient {
  id: string;
  patient: {
    id: string;
    first_name: string;
    last_name?: string;
    full_name?: string;
    date_of_birth?: string;
    gender?: string;
  };
  status: "waiting" | "in_consultation" | "completed" | "skipped" | "cancelled";
  position_in_queue: number;
  appointment_type?: "new" | "follow_up";
}

interface QueueData {
  id: string;
  patient: {
    id: string;
    first_name: string;
    last_name?: string;
    full_name?: string;
    date_of_birth?: string;
    gender?: string;
    relation?: string;
  };
  status: string;
  position_in_queue: number;
  appointment_type?: string;
}

export function SmartQueue() {
  const { selectedPatient, setSelectedPatient, isLocked } = usePatient();
  const toast = useToastNotification();
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);

  // Fetch doctor ID and clinic ID
  useEffect(() => {
    const fetchIds = async () => {
      // Try localStorage first
      let docId = localStorage.getItem("doctor_id");
      let clinId = localStorage.getItem("clinic_id");

      // If not in localStorage, fetch from API
      if (!docId || !clinId) {
        try {
          // Fetch doctor profile to get doctor ID
          if (!docId) {
            const profileResponse = await axiosClient.get("/doctor/profile/");
            const profile = profileResponse.data?.doctor_profile || profileResponse.data;
            docId = profile?.personal_info?.id || profile?.id || profile?.doctor_id;
            if (docId) {
              localStorage.setItem("doctor_id", docId);
              setDoctorId(docId);
            }
          }

          // Fetch clinics to get clinic ID
          if (!clinId) {
            const clinicsResponse = await axiosClient.get("/doctor/profile/clinics");
            const clinics = clinicsResponse.data?.data || clinicsResponse.data?.clinics || [];
            if (Array.isArray(clinics) && clinics.length > 0) {
              const firstClinic = clinics[0];
              clinId = firstClinic?.id || firstClinic?.clinic_id || firstClinic?.clinic?.id;
              if (clinId) {
                localStorage.setItem("clinic_id", clinId);
                setClinicId(clinicId);
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch doctor/clinic IDs:", error);
        }
      }

      if (docId) setDoctorId(docId);
      if (clinId) setClinicId(clinicId);
    };

    fetchIds();
  }, []);

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    if (!doctorId || !clinicId) return;

    setIsLoading(true);
    try {
      const response = await axiosClient.get(`/api/queue/doctor/${doctorId}/${clinicId}/`);
      const queueData: QueueData[] = response.data || [];
      
      // Filter and transform queue data
      const filteredQueue = queueData
        .filter((item) => 
          item.status === "waiting" || 
          item.status === "in_consultation"
        )
        .sort((a, b) => a.position_in_queue - b.position_in_queue) // Sort by position
        .slice(0, 3) // Show max 3 patients
        .map((item) => {
          // Patient data should now be an object with details from the updated serializer
          const patientData = item.patient;

          return {
            id: item.id,
            patient: {
              id: patientData.id,
              first_name: patientData.first_name || "Unknown",
              last_name: patientData.last_name,
              full_name: patientData.full_name || `${patientData.first_name} ${patientData.last_name || ""}`.trim(),
              date_of_birth: patientData.date_of_birth,
              gender: patientData.gender,
            },
            status: item.status as QueuePatient["status"],
            position_in_queue: item.position_in_queue,
            appointment_type: item.appointment_type as "new" | "follow_up" | undefined,
          };
        });

      setQueue(filteredQueue);
    } catch (error) {
      console.error("Failed to fetch queue:", error);
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId, clinicId]);

  // Fetch queue on mount and when IDs are available
  useEffect(() => {
    if (doctorId && clinicId) {
      fetchQueue();
      // Refresh queue every 30 seconds
      const interval = setInterval(fetchQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [doctorId, clinicId, fetchQueue]);

  // Get status color (pastel colors)
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_consultation":
        return "bg-green-400"; // Pastel green
      case "waiting":
        return "bg-yellow-400"; // Pastel yellow
      default:
        return "bg-gray-300"; // Pastel gray
    }
  };

  // Handle patient selection
  const handleSelectPatient = (patient: QueuePatient) => {
    if (isLocked) {
      toast.info("Please end or pause the current consultation to switch patients");
      return;
    }

    const fullName = patient.patient.full_name || 
      `${patient.patient.first_name || ""} ${patient.patient.last_name || ""}`.trim() || 
      "Unknown";

    const patientData = {
      id: patient.patient.id,
      first_name: patient.patient.first_name,
      last_name: patient.patient.last_name || "",
      full_name: fullName,
      gender: patient.patient.gender,
      date_of_birth: patient.patient.date_of_birth,
    };

    setSelectedPatient(patientData);
    
    // Show success notification
    toast.success(`${fullName} selected. Patient is now active in the search bar.`, { duration: 2000 });
  };

  // Dummy data for display
  const dummyPatients: QueuePatient[] = [
    {
      id: "dummy-1",
      patient: {
        id: "dummy-patient-1",
        first_name: "Rahul",
        last_name: "Sharma",
        full_name: "Rahul Sharma",
      },
      status: "waiting",
      position_in_queue: 1,
    },
    {
      id: "dummy-2",
      patient: {
        id: "dummy-patient-2",
        first_name: "Priya",
        last_name: "Patel",
        full_name: "Priya Patel",
      },
      status: "waiting",
      position_in_queue: 2,
    },
    {
      id: "dummy-3",
      patient: {
        id: "dummy-patient-3",
        first_name: "Amit",
        last_name: "Kumar",
        full_name: "Amit Kumar",
      },
      status: "waiting",
      position_in_queue: 3,
    },
  ];

  const queueCount = queue.length;
  const displayQueue = queue.length > 0 ? queue.slice(0, 3) : dummyPatients;
  const waitingCount = displayQueue.filter(p => p.status === "waiting").length;
  const activeCount = displayQueue.filter(p => p.status === "in_consultation").length;

  return (
    <div className={cn(
      "mx-4 mb-2 rounded-lg border border-purple-200/50 dark:border-purple-800/30",
      "bg-white dark:bg-background shadow-sm",
      "flex flex-col overflow-hidden",
      isLocked && "opacity-60"
    )}>
      {/* Header with Purple Background */}
      <div className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800">
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 rounded bg-white/20 backdrop-blur-sm">
            <Users className="h-3 w-3 text-white" />
          </div>
          <h3 className="text-[11px] font-semibold text-white tracking-tight">
            Smart Queue
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-2 gap-1">
            <Clock className="h-3 w-3 text-purple-600 dark:text-purple-400 animate-spin" />
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayQueue.map((patient, index) => {
              const isSelected = selectedPatient?.id === patient.patient.id;
              // Get full name (first name + last name)
              const fullName = patient.patient.full_name || 
                `${patient.patient.first_name || ""} ${patient.patient.last_name || ""}`.trim() || 
                "Unknown";
              const statusColor = getStatusColor(patient.status);
              const isActive = patient.status === "in_consultation";
              const isWaiting = patient.status === "waiting";
              const isDummy = patient.id.startsWith("dummy-");

              return (
                <button
                  key={patient.id}
                  onClick={() => !isDummy && handleSelectPatient(patient)}
                  disabled={isLocked || isDummy}
                  className={cn(
                    "group relative w-full text-left px-2 py-1.5 rounded-md",
                    "border transition-all duration-300 ease-in-out",
                    "flex items-center gap-2",
                    "transform hover:scale-[1.01] active:scale-[0.99]",
                    isDummy
                      ? "bg-purple-50/30 dark:bg-purple-950/10 border-purple-200/30 dark:border-purple-800/20 cursor-default"
                      : isSelected
                      ? "bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-500 dark:border-purple-600 shadow-md shadow-purple-200/50 dark:shadow-purple-900/30 ring-2 ring-purple-300/50 dark:ring-purple-700/50"
                      : "bg-white dark:bg-background border-purple-200/60 dark:border-purple-800/40 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-white dark:hover:from-purple-950/30 dark:hover:to-background hover:shadow-md hover:shadow-purple-100/50 dark:hover:shadow-purple-900/20",
                    isLocked && !isDummy && "cursor-not-allowed opacity-60 hover:scale-100 hover:bg-white dark:hover:bg-background hover:border-purple-200/60 dark:hover:border-purple-800/40 hover:shadow-none"
                  )}
                  title={
                    isDummy
                      ? "Sample patient (dummy data)"
                      : isLocked 
                      ? "End or pause consultation to switch patient" 
                      : `Click to select ${fullName}${isActive ? " (Currently in consultation)" : ""}`
                  }
                >
                  {/* Status Indicator */}
                  <div className="relative flex-shrink-0">
                    <span
                      className={cn(
                        "inline-block h-2 w-2 rounded-full",
                        statusColor,
                        isSelected && "ring-1 ring-white dark:ring-purple-900"
                      )}
                    />
                    {isWaiting && index === 0 && !isDummy && (
                      <span className="absolute -top-0.5 -right-0.5 h-1 w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Patient Full Name */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate transition-colors duration-200",
                      isSelected 
                        ? "text-black dark:text-white" 
                        : isDummy
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-black dark:text-white group-hover:text-black dark:group-hover:text-white"
                    )}>
                      {fullName}
                    </p>
                    {isActive && !isDummy && (
                      <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                        In consultation
                      </p>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && !isDummy && (
                    <div className="flex-shrink-0">
                      <div className="p-0.5 rounded-full bg-purple-600 dark:bg-purple-500 shadow-sm">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Hover Arrow Indicator */}
                  {!isSelected && !isDummy && !isLocked && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <svg 
                          className="h-2 w-2 text-purple-600 dark:text-purple-400" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Footer Message */}
        {isLocked && selectedPatient && (
          <div className="mt-1.5 pt-1.5 border-t border-purple-200/50 dark:border-purple-800/30">
            <div className="flex items-start gap-1 p-1 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30">
              <AlertCircle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 dark:text-amber-300 leading-tight">
                Consultation active. End or pause to switch.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

