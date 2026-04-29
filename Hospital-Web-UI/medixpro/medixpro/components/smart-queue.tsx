"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePatient } from "@/lib/patientContext";
import { Check, Users, Clock, AlertCircle } from "lucide-react";
import axiosClient from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { loadStaffClinicSelection } from "@/lib/doctorClinicsClient";

interface QueuePatient {
  id: string;
  encounter_id: string | null;
  /** Per-visit number — distinguishes same name different visits. */
  visit_pnr: string | null;
  /** Unique patient profile id in EMR (names can repeat). */
  patient_public_id: string | null;
  patient_name: string;
  age: number | null;
  gender: string | null;
  status: "waiting" | "vitals_done";
  token: string | null;
  position: number;
}

interface QueueData {
  id: string;
  encounter_id: string | null;
  visit_pnr?: string | null;
  patient_public_id?: string | null;
  patient_name: string;
  age: number | null;
  gender: string | null;
  status: "waiting" | "vitals_done";
  token: string | null;
  position: number;
}

interface SmartQueueUpdatePayload {
  type?: string;
  doctor_id?: string;
  clinic_id?: string;
  data?: {
    top_queue?: QueuePatient[];
    total_active?: number;
  };
}

function resolveWebsocketBaseUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  if (typeof window === "undefined") {
    return null;
  }
  // Same-origin (typical: Next + reverse proxy routes /ws/ to Daphne/ASGI on same host).
  const { protocol, host } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProto}//${host}`;
}

export function SmartQueue() {
  const { selectedPatient, isLocked } = usePatient();
  const toast = useToastNotification();
  const [queue, setQueue] = useState<QueuePatient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [wsLive, setWsLive] = useState<"off" | "connecting" | "open" | "closed">("off");
  const socketRef = useRef<WebSocket | null>(null);
  const closedCleanRef = useRef(false);

  // Resolve doctor + clinic scope the same way other doctor flows do (avoids wrong clinic from older localStorage).
  useEffect(() => {
    const resolve = async () => {
      try {
        const profileResponse = await axiosClient.get("/doctor/profile/");
        const profile = profileResponse.data?.doctor_profile || profileResponse.data;
        const fromProfile = profile?.personal_info?.id || profile?.id || profile?.doctor_id;
        if (fromProfile) {
          const s = String(fromProfile);
          localStorage.setItem("doctor_id", s);
          setDoctorId(s);
        }

        const { clinicId: resolvedClinic } = await loadStaffClinicSelection();
        if (resolvedClinic) {
          setClinicId(String(resolvedClinic));
        }
      } catch (e) {
        console.error("SmartQueue: failed to resolve doctor/clinic context:", e);
      }
    };
    void resolve();
  }, []);

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    if (!doctorId || !clinicId) return;

    setIsLoading(true);
    try {
      const response = await axiosClient.get(`/queue/doctor/${doctorId}/${clinicId}/`);
      const queueData: QueueData[] = response.data || [];
      // Backend is source of truth: response is already ordered; only cap UI to top 3.
      setQueue(
        queueData.slice(0, 3).map((row) => ({
          ...row,
          visit_pnr: row.visit_pnr ?? null,
          patient_public_id: row.patient_public_id ?? null,
        }))
      );
    } catch (error) {
      console.error("Failed to fetch queue:", error);
      setQueue([]);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId, clinicId]);

  // Initial queue bootstrap after IDs are available.
  useEffect(() => {
    if (doctorId && clinicId) {
      void fetchQueue();
    }
  }, [doctorId, clinicId, fetchQueue]);

  useEffect(() => {
    if (!doctorId || !clinicId || typeof window === "undefined") return;

    const wsBase = resolveWebsocketBaseUrl();
    if (!wsBase) {
      setWsLive("off");
      return;
    }

    const wsUrl = `${wsBase}/ws/queue-updates/${clinicId}/${doctorId}/`;
    closedCleanRef.current = false;
    setWsLive("connecting");
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
    } catch {
      setWsLive("closed");
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => setWsLive("open");
    socket.onclose = () => {
      socketRef.current = null;
      if (!closedCleanRef.current) {
        setWsLive("closed");
      }
    };
    socket.onerror = () => {
      // If handshake fails, onclose may not always follow consistently across browsers.
      if (socket.readyState === WebSocket.CONNECTING) {
        setWsLive("closed");
      }
    };
    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SmartQueueUpdatePayload;
        if (payload.type !== "SMART_QUEUE_UPDATE") return;
        if (payload.clinic_id && String(payload.clinic_id) !== String(clinicId)) return;
        if (payload.doctor_id && String(payload.doctor_id) !== String(doctorId)) return;

        const topQueue = payload.data?.top_queue;
        if (Array.isArray(topQueue)) {
          setQueue(
            topQueue.map((row) => ({
              ...row,
              visit_pnr: row.visit_pnr ?? null,
              patient_public_id: row.patient_public_id ?? null,
            }))
          );
          return;
        }
      } catch {
        if (process.env.NODE_ENV !== "production") {
          console.warn("SmartQueue: non-JSON websocket frame ignored");
        }
      }
    };

    return () => {
      closedCleanRef.current = true;
      setWsLive("off");
      socket?.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [clinicId, doctorId, fetchQueue]);

  // Fallback polling is active only while websocket is disconnected.
  useEffect(() => {
    if (!doctorId || !clinicId) return;
    if (wsLive === "open" || wsLive === "connecting" || wsLive === "off") return;
    const interval = setInterval(() => {
      void fetchQueue();
    }, 60000);
    return () => clearInterval(interval);
  }, [clinicId, doctorId, wsLive, fetchQueue]);

  // Get status color (pastel colors)
  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-400"; // Pastel yellow
      case "vitals_done":
        return "bg-blue-400";
      default:
        return "bg-gray-300"; // Pastel gray
    }
  };

  const handleStartConsultation = async (patient: QueuePatient) => {
    if (isLocked) {
      toast.info("Please end or pause the current consultation to switch patients");
      return;
    }
    if (!clinicId || !patient.encounter_id) {
      toast.error("Unable to start consultation for this patient.");
      return;
    }

    try {
      await axiosClient.patch("/queue/start/", {
        clinic_id: clinicId,
        encounter_id: patient.encounter_id,
      });
      toast.success(`Consultation started for ${patient.patient_name}.`);
    } catch (error: any) {
      const statusCode = error?.response?.status;
      if (statusCode === 409) {
        toast.error("Consultation already started or patient is no longer active in queue.");
      } else {
        toast.error("Failed to start consultation. Please try again.");
      }
    }
  };

  const displayQueue = queue.slice(0, 3);

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
            {displayQueue.length === 0 ? (
              <div className="py-2 text-center text-[10px] text-muted-foreground">
                No patients in queue
              </div>
            ) : (
              displayQueue.map((patient, index) => {
              const isSelected = selectedPatient?.id === patient.id;
              const statusColor = getStatusColor(patient.status);
              const isWaiting = patient.status === "waiting";

              return (
                <button
                  key={patient.id}
                  onClick={() => handleStartConsultation(patient)}
                  disabled={isLocked}
                  className={cn(
                    "group relative w-full text-left px-2 py-1.5 rounded-md",
                    "border transition-all duration-300 ease-in-out",
                    "flex items-center gap-2",
                    "transform hover:scale-[1.01] active:scale-[0.99]",
                    isSelected
                      ? "bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-500 dark:border-purple-600 shadow-md shadow-purple-200/50 dark:shadow-purple-900/30 ring-2 ring-purple-300/50 dark:ring-purple-700/50"
                      : "bg-white dark:bg-background border-purple-200/60 dark:border-purple-800/40 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-white dark:hover:from-purple-950/30 dark:hover:to-background hover:shadow-md hover:shadow-purple-100/50 dark:hover:shadow-purple-900/20",
                    isLocked && "cursor-not-allowed opacity-60 hover:scale-100 hover:bg-white dark:hover:bg-background hover:border-purple-200/60 dark:hover:border-purple-800/40 hover:shadow-none"
                  )}
                  title={
                    isLocked 
                      ? "End or pause consultation to switch patient" 
                      : `Start consultation for ${patient.patient_name}`
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
                    {isWaiting && index === 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-1 w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Patient Name + Metadata */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-xs font-medium truncate transition-colors duration-200",
                      isSelected 
                        ? "text-black dark:text-white" 
                        : "text-black dark:text-white group-hover:text-black dark:group-hover:text-white"
                    )}>
                      {patient.patient_name}
                    </p>
                    <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                      #{patient.position}
                      {patient.visit_pnr ? `  Visit ${patient.visit_pnr}` : ""}
                      {patient.patient_public_id ? `  Pat ${patient.patient_public_id}` : ""}
                      {patient.token ? `  Token ${patient.token}` : ""}
                      {patient.age ? `  ${patient.age}y` : ""}
                      {patient.gender ? `  ${patient.gender}` : ""}
                    </p>
                    {index === 0 && (
                      <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">
                        Next
                      </p>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="p-0.5 rounded-full bg-purple-600 dark:bg-purple-500 shadow-sm">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Hover Arrow Indicator */}
                  {!isSelected && !isLocked && (
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
            }))}
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

