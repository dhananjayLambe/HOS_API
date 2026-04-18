"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePatient } from "@/lib/patientContext";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Search, Save, X, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { VitalsSection } from "@/components/consultations/vitals-section";
import { HistorySection } from "@/components/consultations/history-section";
import { AllergiesSection } from "@/components/consultations/allergies-section";
import { ChiefComplaintSection } from "@/components/consultations/chief-complaint-section";
import axiosClient, { backendAxiosClient } from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePreConsultationTemplateStore } from "@/store/preConsultationTemplateStore";

function PreConsultationPageContent() {
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();
  const [showAlert, setShowAlert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  
  // Get encounter_id from URL params (required for API calls)
  const urlEncounterId = searchParams.get("encounter_id");
  const [encounterId, setEncounterId] = useState<string | null>(urlEncounterId);
  const [visitPnr, setVisitPnr] = useState<string | null>(null);
  const [isCreatingEncounter, setIsCreatingEncounter] = useState(false);

  // Keep encounterId in sync with URL (e.g. after redirect or direct load with ?encounter_id=)
  useEffect(() => {
    if (urlEncounterId) setEncounterId(urlEncounterId);
  }, [urlEncounterId]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [preConsultationStarted, setPreConsultationStarted] = useState(false);
  // Entry flow: "active" | "completed" | "none" | null (null = not resolved or has encounter_id in URL)
  const [entryState, setEntryState] = useState<"active" | "completed" | "none" | null>(null);
  const [isResolvingEntry, setIsResolvingEntry] = useState(false);
  const [encounterStatus, setEncounterStatus] = useState<string | null>(null);
  const [isStartingNewVisit, setIsStartingNewVisit] = useState(false);
  const [showStartNewVisitConfirm, setShowStartNewVisitConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Cancel Visit (commented out for later use)
  // const [showCancelVisitConfirm, setShowCancelVisitConfirm] = useState(false);
  // const [isCancellingVisit, setIsCancellingVisit] = useState(false);

  // Prevent multiple redirects when encounter is cancelled (stops infinite loop)
  const redirectingDueToCancelledRef = useRef(false);
  const redirectedForEncounterIdRef = useRef<string | null>(null);

  // Template store for checking enabled sections
  const { template, fetchTemplate, isSectionEnabled } = usePreConsultationTemplateStore();

  // Pre-consultation data state
  const [preConsultationData, setPreConsultationData] = useState({
    vitals: null as any,
    history: null as any,
    allergies: null as any,
    chiefComplaint: null as any,
  });

  // Previous records state
  const [previousRecords, setPreviousRecords] = useState({
    vitals: [] as any[],
    history: [] as any[],
    allergies: [] as any[],
    chiefComplaint: [] as any[],
  });

  // Sample history data for UI development
  const getSampleHistoryData = () => {
    const now = new Date();
    const getDate = (daysAgo: number, hours: number = 10) => {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(hours, 30, 0, 0);
      return date.toISOString();
    };

    return {
      vitals: [
        {
          date: getDate(5, 14),
          consultation_id: 101,
          blood_pressure: { systolic: 130, diastolic: 85 },
          temperature: { value: 98.6 },
          height_weight: { height_cm: 170, weight_kg: 72, bmi: 24.9 },
        },
        {
          date: getDate(12, 11),
          consultation_id: 98,
          blood_pressure: { systolic: 125, diastolic: 80 },
          temperature: { value: 99.2 },
          height_weight: { height_cm: 170, weight_kg: 71, bmi: 24.6 },
        },
        {
          date: getDate(20, 15),
          consultation_id: 95,
          blood_pressure: { systolic: 140, diastolic: 90 },
          temperature: { value: 98.4 },
          height_weight: { height_cm: 170, weight_kg: 73, bmi: 25.3 },
        },
        {
          date: getDate(30, 9),
          consultation_id: 89,
          blood_pressure: { systolic: 128, diastolic: 82 },
          temperature: { value: 98.8 },
        },
      ],
      history: [
        {
          date: getDate(5, 14),
          consultation_id: 101,
          medical_history: {
            conditions: ["Hypertension", "Diabetes"],
          },
          surgical_history: {
            procedure: "Appendectomy",
            year: 2015,
          },
        },
        {
          date: getDate(12, 11),
          consultation_id: 98,
          medical_history: {
            conditions: ["Hypertension"],
          },
          obstetric_history: {
            gravida: 2,
            para: 1,
          },
        },
        {
          date: getDate(20, 15),
          consultation_id: 95,
          medical_history: {
            conditions: ["Diabetes", "Thyroid"],
          },
          surgical_history: {
            procedure: "Gallbladder Removal",
            year: 2018,
          },
        },
        {
          date: getDate(30, 9),
          consultation_id: 89,
          medical_history: {
            conditions: ["Hypertension"],
          },
        },
      ],
      allergies: [
        {
          date: getDate(5, 14),
          consultation_id: 101,
          drug_allergy: {
            drug_name: "Penicillin",
            reaction: "Rash",
          },
          food_allergy: {
            food_name: "Peanuts",
            reaction: "Breathing difficulty",
          },
        },
        {
          date: getDate(12, 11),
          consultation_id: 98,
          drug_allergy: {
            drug_name: "Sulfa drugs",
            reaction: "Rash",
          },
        },
        {
          date: getDate(20, 15),
          consultation_id: 95,
          no_allergies: true,
        },
        {
          date: getDate(30, 9),
          consultation_id: 89,
          food_allergy: {
            food_name: "Shellfish",
            reaction: "Vomiting",
          },
        },
      ],
      chiefComplaint: [
        {
          date: getDate(5, 14),
          consultation_id: 101,
          complaint: "Persistent headache for the past 3 days, accompanied by mild dizziness. No relief with over-the-counter pain medication.",
        },
        {
          date: getDate(12, 11),
          consultation_id: 98,
          complaint: "Fever and cold symptoms for 5 days. Body temperature ranges between 99-100°F. Experiencing nasal congestion and mild cough.",
        },
        {
          date: getDate(20, 15),
          consultation_id: 95,
          complaint: "Severe abdominal pain in the lower right quadrant. Pain started 2 days ago and has been gradually worsening. Associated with nausea.",
        },
        {
          date: getDate(30, 9),
          consultation_id: 89,
          complaint: "Follow-up visit for hypertension management. Patient reports feeling well, no new complaints. Blood pressure monitoring required.",
        },
        {
          date: getDate(45, 10),
          consultation_id: 82,
          complaint: "Routine check-up. Patient reports occasional joint pain in knees, especially in the morning. No other significant symptoms.",
        },
      ],
    };
  };

  // Fetch template on mount. In development, force refresh once so template changes (step, suffix, range) load after backend/cache clear.
  const hasFetchedTemplateRef = useRef(false);
  useEffect(() => {
    const isDev = process.env.NODE_ENV === "development";
    if (!template && !hasFetchedTemplateRef.current) {
      hasFetchedTemplateRef.current = true;
      fetchTemplate(isDev);
    } else if (isDev && !hasFetchedTemplateRef.current) {
      hasFetchedTemplateRef.current = true;
      fetchTemplate(true);
    }
  }, [template, fetchTemplate]);

  // Entry flow: when no encounter_id in URL and patient selected, resolve (active / completed / none)
  useEffect(() => {
    if (encounterId || !selectedPatient?.id || isResolvingEntry) return;

    const resolveEntry = async () => {
      setIsResolvingEntry(true);
      try {
        const response = await backendAxiosClient.post<{
          entry_state: "active" | "completed" | "none";
          encounter?: { id: string; visit_pnr: string; status: string };
          redirect_to?: "pre" | "consultation";
        }>("/consultations/entry/resolve/", {
          patient_profile_id: selectedPatient.id,
        });
        const state = response.data?.entry_state;
        if (state === "active" && response.data?.encounter?.id) {
          const enc = response.data.encounter;
          const encId = enc.id;
          setEncounterId(encId);
          setVisitPnr(enc.visit_pnr || null);
          setEntryState("active");
          router.replace(`/consultations/pre-consultation?encounter_id=${encId}`, { scroll: false });
          if (response.data.redirect_to === "consultation") {
            router.replace(`/consultations/start-consultation?encounter_id=${encId}`);
          }
        } else if (state === "completed" || state === "none") {
          // No active visit: show Start New Visit page so user explicitly starts a new visit (avoids auto-create errors/race)
          setEntryState("completed");
        }
      } catch (error: any) {
        const msg = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to resolve entry.";
        toast.error(msg);
      } finally {
        setIsResolvingEntry(false);
      }
    };

    resolveEntry();
  }, [selectedPatient?.id, encounterId, isResolvingEntry, router]);

  // When encounter_id in URL, fetch encounter detail to know status (redirect to consultation if in progress, or redirect when cancelled)
  useEffect(() => {
    if (!encounterId) return;
    if (redirectingDueToCancelledRef.current && redirectedForEncounterIdRef.current === encounterId) return;
    let cancelled = false;
    backendAxiosClient
      .get<{ status: string; cancelled?: boolean; visit_pnr?: string }>(`/consultations/encounter/${encounterId}/`)
      .then((res) => {
        if (cancelled) return;
        const st = (res.data?.status || "").toUpperCase().replace(/\s/g, "_");
        setEncounterStatus(st);
        if (res.data?.visit_pnr) {
          setVisitPnr(res.data.visit_pnr);
        }
        if (st === "CANCELLED" || res.data?.cancelled) {
          redirectingDueToCancelledRef.current = true;
          redirectedForEncounterIdRef.current = encounterId;
          toast.error("Visit already cancelled.");
          router.replace("/doctor-dashboard");
          return;
        }
        if (st === "CONSULTATION_IN_PROGRESS") {
          router.replace(`/consultations/start-consultation?encounter_id=${encounterId}`);
        }
      })
      .catch(() => {
        if (!cancelled) setEncounterStatus(null);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally omit toast from deps to avoid effect re-running and causing redirect loop
  }, [encounterId, router]);

  // Dedicated fetch for visit_pnr so header PNR always shows (status effect may redirect before setting it)
  useEffect(() => {
    if (!encounterId) {
      setVisitPnr(null);
      return;
    }
    let cancelled = false;
    backendAxiosClient
      .get<{ visit_pnr?: string }>(`/consultations/encounter/${encounterId}/`)
      .then((res) => {
        if (!cancelled && res.data?.visit_pnr) {
          setVisitPnr(res.data.visit_pnr);
        }
      })
      .catch(() => {
        if (!cancelled) setVisitPnr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [encounterId]);

  // Start pre-consultation when we have an encounter (status CREATED → PRE_CONSULTATION_IN_PROGRESS). Skip if cancelled.
  useEffect(() => {
    if (!encounterId || preConsultationStarted || redirectingDueToCancelledRef.current) return;
    if (encounterStatus === "CANCELLED") return;
    const startPreConsultation = async () => {
      try {
        await backendAxiosClient.post(
          `/consultations/encounter/${encounterId}/pre-consultation/start/`
        );
        setPreConsultationStarted(true);
      } catch (e: any) {
        if (e?.response?.status === 400) setPreConsultationStarted(true);
      }
    };
    startPreConsultation();
  }, [encounterId, encounterStatus, preConsultationStarted]);

  // Load existing section data if encounter_id is available (parallel requests). Skip if cancelled.
  useEffect(() => {
    if (!encounterId || redirectingDueToCancelledRef.current || encounterStatus === "CANCELLED") return;

    const sectionCodes = ["vitals", "chief_complaint", "allergies", "medical_history"] as const;
    const sectionMap: Record<string, keyof typeof preConsultationData> = {
      vitals: "vitals",
      chief_complaint: "chiefComplaint",
      allergies: "allergies",
      medical_history: "history",
    };

    let cancelled = false;
    const loadExistingData = async () => {
      const results = await Promise.allSettled(
        sectionCodes.map((sectionCode) =>
          backendAxiosClient.get(
            `/consultations/pre-consult/encounter/${encounterId}/section/${sectionCode}/`
          )
        )
      );
      if (cancelled) return;
      const updates: Partial<typeof preConsultationData> = {};
      results.forEach((result, i) => {
        if (result.status !== "fulfilled" || result.value?.data?.data == null) {
          if (result.status === "rejected" && result.reason?.response?.status !== 404) {
            console.error(`Error loading ${sectionCodes[i]}:`, result.reason);
          }
          return;
        }
        const sectionKey = sectionMap[sectionCodes[i]];
        if (sectionKey) updates[sectionKey] = result.value.data.data;
      });
      if (Object.keys(updates).length > 0) {
        setPreConsultationData((prev) => ({ ...prev, ...updates }));
      }
    };

    loadExistingData();
    return () => {
      cancelled = true;
    };
  }, [encounterId, encounterStatus]);

  useEffect(() => {
    if (!selectedPatient) {
      setShowAlert(true);
      setPreviousRecords({
        vitals: [],
        history: [],
        allergies: [],
        chiefComplaint: [],
      });
    } else {
      fetchPreviousRecords();
    }
  }, [selectedPatient?.id]);

  const fetchPreviousRecords = async () => {
    if (!selectedPatient?.id) return;

    setIsLoadingHistory(true);
    try {
      // Use the new pre-consultation previous records API
      // Use backendAxiosClient for direct Django backend calls
      const response = await backendAxiosClient.get(
        `/consultations/pre-consult/patient/${selectedPatient.id}/previous-records/`
      );

      if (response.data?.data) {
        // Transform API response to match expected format
        const records = {
          vitals: [] as any[],
          history: [] as any[],
          allergies: [] as any[],
          chiefComplaint: [] as any[],
        };

        response.data.data.forEach((record: any) => {
          const recordDate = record.encounter_date || record.created_at;
          
          if (record.sections?.vitals) {
            records.vitals.push({
              ...record.sections.vitals,
              date: recordDate,
              consultation_id: record.encounter_id,
            });
          }
          if (record.sections?.medical_history) {
            records.history.push({
              ...record.sections.medical_history,
              date: recordDate,
              consultation_id: record.encounter_id,
            });
          }
          if (record.sections?.allergies) {
            records.allergies.push({
              ...record.sections.allergies,
              date: recordDate,
              consultation_id: record.encounter_id,
            });
          }
          if (record.sections?.chief_complaint) {
            records.chiefComplaint.push({
              complaint: record.sections.chief_complaint,
              date: recordDate,
              consultation_id: record.encounter_id,
            });
          }
        });

        setPreviousRecords(records);
      }
    } catch (error) {
      console.error("Error fetching previous records:", error);
      // Fallback to sample data for UI development
      setPreviousRecords(getSampleHistoryData());
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    router.push("/doctor-dashboard");
  };

  const handleSave = async () => {
    // Check if at least one section has data
    const hasAnyData = Object.values(preConsultationData).some(
      (data) => data !== null && Object.keys(data).length > 0
    );

    if (!hasAnyData) {
      toast.error("Please add at least one pre-consultation entry before saving.");
      return;
    }

    // Check if patient is selected
    if (!selectedPatient?.id) {
      toast.error("Please select a patient first.");
      return;
    }

    // Create encounter if it doesn't exist
    let currentEncounterId = encounterId;
    if (!currentEncounterId) {
      setIsSaving(true);
      try {
        const response = await backendAxiosClient.post(
          "/consultations/pre-consult/encounter/create/",
          { patient_profile_id: selectedPatient.id }
        );

        if (response.data?.status && response.data?.data?.encounter_id) {
          currentEncounterId = response.data.data.encounter_id;
          setEncounterId(currentEncounterId);
          // Update URL without page reload
          router.replace(`/consultations/pre-consultation?encounter_id=${currentEncounterId}`, { scroll: false });
        } else {
          toast.error("Failed to create encounter.");
          setIsSaving(false);
          return;
        }
      } catch (error: any) {
        console.error("Error creating encounter:", error);
        const errorMsg = error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message || 
                        "Network error. Please check your connection.";
        const statusCode = error.response?.status;
        toast.error(`Failed to create encounter${statusCode ? ` (${statusCode})` : ""}: ${errorMsg}`);
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(true);
    const sectionMap: Record<string, string> = {
      vitals: "vitals",
      chiefComplaint: "chief_complaint",
      allergies: "allergies",
      history: "medical_history",
    };

    const saveResults: Array<{ section: string; success: boolean; error?: string }> = [];

    try {
      // Save each section that has data with individual error handling
      const savePromises = Object.entries(preConsultationData)
        .filter(([_, data]) => data !== null && Object.keys(data).length > 0)
        .map(async ([sectionKey, data]) => {
          const sectionCode = sectionMap[sectionKey];
          if (!sectionCode) {
            console.warn(`Unknown section key: ${sectionKey}`);
            saveResults.push({ section: sectionKey, success: false, error: "Unknown section" });
            return;
          }

          try {
            const response = await backendAxiosClient.post(
              `/consultations/pre-consult/encounter/${currentEncounterId}/section/${sectionCode}/`,
              { data }
            );
            
            // Validate response
            if (response.data?.status !== true && response.status !== 200 && response.status !== 201) {
              throw new Error(response.data?.message || "Invalid response from server");
            }
            
            saveResults.push({ section: sectionKey, success: true });
          } catch (error: any) {
            console.error(`Error saving ${sectionCode}:`, error);
            const errorMsg = error.response?.data?.message || 
                            error.response?.data?.error ||
                            error.message || 
                            "Unknown error";
            const statusCode = error.response?.status;
            saveResults.push({ 
              section: sectionKey, 
              success: false, 
              error: `${errorMsg}${statusCode ? ` (${statusCode})` : ""}` 
            });
            throw error; // Re-throw to be caught by outer catch
          }
        });
      
      await Promise.all(savePromises);
      
      // Check if all saves succeeded
      const failedSaves = saveResults.filter((r) => !r.success);
      if (failedSaves.length > 0) {
        const failedSections = failedSaves.map((r) => r.section).join(", ");
        toast.error(`Failed to save: ${failedSections}. Please try again.`);
        return;
      }

      toast.success("Pre-consultation draft saved.");

      // Optional: stay on page for further edits, or go to dashboard
      setTimeout(() => {
        router.push("/doctor-dashboard");
      }, 500);
    } catch (error: any) {
      console.error("Error saving pre-consultation:", error);
      
      // More detailed error handling
      if (error.response) {
        // Server responded with error
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        if (statusCode === 400) {
          toast.error(`Validation error: ${errorData?.message || errorData?.error || "Invalid data format"}`);
        } else if (statusCode === 401) {
          toast.error("Session expired. Please log in again.");
        } else if (statusCode === 403) {
          toast.error("You don't have permission to save this data.");
        } else if (statusCode === 404) {
          toast.error("Encounter not found. Please refresh the page.");
        } else if (statusCode === 500) {
          toast.error("Server error. Please try again later or contact support.");
        } else {
          toast.error(`Failed to save: ${errorData?.message || errorData?.error || `Error ${statusCode}`}`);
        }
      } else if (error.request) {
        // Request made but no response
        toast.error("Network error. Please check your internet connection and try again.");
      } else {
        // Something else happened
        toast.error(`Failed to save: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleLeaveConfirmYes = () => {
    setShowLeaveConfirm(false);
    router.push("/doctor-dashboard");
  };

  // Cancel Visit (commented out for later use)
  // const handleCancelVisitClick = () => {
  //   setShowCancelVisitConfirm(true);
  // };

  // const handleCancelVisitConfirmYes = async () => {
  //   setShowCancelVisitConfirm(false);
  //   if (encounterId) {
  //     setIsCancellingVisit(true);
  //     try {
  //       await backendAxiosClient.post(`/consultations/encounter/${encounterId}/cancel/`);
  //       toast.success("Visit cancelled successfully.");
  //       router.push("/doctor-dashboard");
  //     } catch (err: any) {
  //       const msg = err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to cancel visit.";
  //       toast.error(msg);
  //     } finally {
  //       setIsCancellingVisit(false);
  //     }
  //   } else {
  //     router.push("/doctor-dashboard");
  //   }
  // };

  const handleStartNewVisit = async (_fromActiveVisit?: boolean) => {
    if (!selectedPatient?.id) return;
    setIsStartingNewVisit(true);
    try {
      const response = await backendAxiosClient.post<{
        encounter_id: string;
        redirect_url?: string;
      }>("/consultations/entry/start-new-visit/", {
        patient_profile_id: selectedPatient.id,
      });
      const url = response.data?.redirect_url || `/consultations/pre-consultation?encounter_id=${response.data?.encounter_id}`;
      toast.success("New visit started.");
      router.push(url);
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to start new visit.";
      toast.error(msg);
    } finally {
      setIsStartingNewVisit(false);
      setShowStartNewVisitConfirm(false);
    }
  };

  const handleCompleteAndRedirect = async () => {
    const hasAnyData = Object.values(preConsultationData).some(
      (data) => data !== null && Object.keys(data).length > 0
    );
    if (!hasAnyData) {
      toast.error("Please add at least one pre-consultation entry before completing.");
      return;
    }
    if (!selectedPatient?.id) {
      toast.error("Please select a patient first.");
      return;
    }
    let currentEncounterId = encounterId;
    if (!currentEncounterId) {
      try {
        const createRes = await backendAxiosClient.post(
          "/consultations/pre-consult/encounter/create/",
          { patient_profile_id: selectedPatient.id }
        );
        if (!createRes.data?.status || !createRes.data?.data?.encounter_id) {
          toast.error("Failed to create encounter.");
          return;
        }
        currentEncounterId = createRes.data.data.encounter_id;
        setEncounterId(currentEncounterId);
        router.replace(`/consultations/pre-consultation?encounter_id=${currentEncounterId}`, { scroll: false });
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || "Failed to create encounter.");
        return;
      }
    }
    setIsCompleting(true);
    const sectionMap: Record<string, string> = {
      vitals: "vitals",
      chiefComplaint: "chief_complaint",
      allergies: "allergies",
      history: "medical_history",
    };
    try {
      const sectionsToSave = Object.entries(preConsultationData)
        .filter(([_, data]) => data !== null && Object.keys(data).length > 0)
        .map(([sectionKey, data]) => ({ sectionKey, data, sectionCode: sectionMap[sectionKey] }));
      for (const { sectionCode, data } of sectionsToSave) {
        if (!sectionCode) continue;
        await backendAxiosClient.post(
          `/consultations/pre-consult/encounter/${currentEncounterId}/section/${sectionCode}/`,
          { data }
        );
      }
      const completeRes = await backendAxiosClient.post<{
        redirect_url?: string;
        status?: string;
        detail?: string;
      }>(`/consultations/encounter/${currentEncounterId}/pre-consultation/complete/`);
      const redirectUrl = completeRes.data?.redirect_url || `/consultations/consultation/${currentEncounterId}`;
      toast.success("Pre-consultation completed. Redirecting to consultation.");
      router.push(redirectUrl);
    } catch (error: any) {
      const msg = error.response?.data?.detail ?? error.response?.data?.message ?? error.message ?? "Failed to complete pre-consultation.";
      toast.error(msg);
      if (currentEncounterId) {
        router.push(`/consultations/consultation/${currentEncounterId}`);
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const sectionMap: Record<string, string> = {
    vitals: "vitals",
    chiefComplaint: "chief_complaint",
    allergies: "allergies",
    history: "medical_history",
  };

  // Persist a single section to the backend (creates encounter if needed). Call when user saves from modal.
  const persistSectionToBackend = async (sectionKey: keyof typeof preConsultationData, data: any) => {
    const sectionCode = sectionMap[sectionKey];
    if (!sectionCode || !data || Object.keys(data).length === 0) return;
    if (!selectedPatient?.id) {
      toast.error("Select a patient first.");
      return;
    }
    let encId = encounterId;
    if (!encId) {
      try {
        const res = await backendAxiosClient.post(
          "/consultations/pre-consult/encounter/create/",
          { patient_profile_id: selectedPatient.id }
        );
        if (!res.data?.status || !res.data?.data?.encounter_id) {
          toast.error("Failed to create encounter.");
          return;
        }
        encId = res.data.data.encounter_id;
        setEncounterId(encId);
        router.replace(`/consultations/pre-consultation?encounter_id=${encId}`, { scroll: false });
      } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to create encounter.";
        toast.error(msg);
        return;
      }
    }
    try {
      const response = await backendAxiosClient.post(
        `/consultations/pre-consult/encounter/${encId}/section/${sectionCode}/`,
        { data }
      );
      if (response.data?.status !== true) {
        toast.error(response.data?.message || "Failed to save section.");
        return;
      }
      toast.success("Saved to record.");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to save.";
      toast.error(msg);
    }
  };

  const updateSectionData = (section: keyof typeof preConsultationData, data: any) => {
    setPreConsultationData((prev) => ({
      ...prev,
      [section]: data,
    }));
    // Phase-1: No auto-save; data stays in state until "Complete & Start Consultation"
  };

  const preLocked =
    encounterStatus === "CONSULTATION_IN_PROGRESS" ||
    encounterStatus === "CONSULTATION_COMPLETED" ||
    encounterStatus === "CLOSED" ||
    encounterStatus === "CANCELLED";

  const handleCopyPnr = () => {
    if (!visitPnr) return;
    navigator.clipboard
      .writeText(visitPnr)
      .then(() => {
        toast.success("Visit PNR copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy PNR");
      });
  };

  // Start New Visit page (commented out for later use): no active visit — user clicks to start a new encounter
  if (entryState === "completed" && !encounterId) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/doctor-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pre-Consultation</h1>
              <p className="text-muted-foreground">No active visit for this patient.</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-6 text-center max-w-md mx-auto">
          <p className="text-muted-foreground mb-4">Start a new visit to record pre-consultation and begin consultation.</p>
          <Button
            onClick={() => handleStartNewVisit(false)}
            disabled={isStartingNewVisit}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start New Visit
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedPatient) {
    return (
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle className="text-xl">Select Patient First</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Please select a patient from the search bar at the top to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
            <Search className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="text-sm text-purple-900 dark:text-purple-200">
              Look for the <span className="font-semibold">"Select Patient"</span> search bar in the header
            </p>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogAction
              onClick={() => {
                setShowAlert(false);
                triggerSearchHighlight();
                router.push("/doctor-dashboard");
              }}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white order-1"
            >
              Show Search Bar
            </AlertDialogAction>
            <AlertDialogAction onClick={handleAlertClose} className="w-full sm:w-auto order-2">
              Go to Dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 -mx-6 px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackClick} type="button">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pre-Consultation</h1>
              {encounterId && (
                <div className="flex items-center gap-1.5 shrink-0 rounded-lg border border-border/80 bg-muted/50 px-2.5 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">PNR:</span>
                  <span
                    className="text-xs font-mono text-foreground truncate max-w-[160px] sm:max-w-[220px]"
                    title={visitPnr ?? undefined}
                  >
                    {visitPnr ?? "…"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 rounded"
                    type="button"
                    onClick={handleCopyPnr}
                    disabled={!visitPnr}
                    aria-label="Copy visit PNR"
                  >
                    {/* Small copy glyph using two rectangles to avoid new icon import */}
                    <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-[10px] text-muted-foreground">
                      📋
                    </span>
                  </Button>
                </div>
              )}
            </div>
            <p className="text-muted-foreground">Record patient information before consultation</p>
            {(isResolvingEntry || isCreatingEncounter) && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{isResolvingEntry ? "Checking visit status..." : "Creating encounter..."}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {!preLocked && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <Label htmlFor="quick-mode" className="text-sm font-medium cursor-pointer">
                    Quick Mode
                  </Label>
                  {quickMode && (
                    <span className="text-xs text-muted-foreground truncate">Showing: Vitals, Complaint, Allergies</span>
                  )}
                </div>
                <Switch id="quick-mode" checked={quickMode} onCheckedChange={setQuickMode} className="shrink-0" />
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Cancel Visit button (commented out for later use) */}
                {/* <Button
                  variant="outline"
                  onClick={handleCancelVisitClick}
                  disabled={isCancellingVisit}
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">{isCancellingVisit ? "Cancelling..." : "Cancel Visit"}</span>
                  <span className="sm:hidden">{isCancellingVisit ? "..." : "Cancel"}</span>
                </Button> */}
                <Button
                  onClick={handleCompleteAndRedirect}
                  disabled={isCompleting}
                  className="gap-2 bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-initial"
                >
                  {isCompleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isCompleting ? "Completing..." : "Complete & Start Consultation"}
                  </span>
                  <span className="sm:hidden">{isCompleting ? "..." : "Complete"}</span>
                </Button>
              </div>
            </>
          )}
          {/* <Button
            variant="secondary"
            onClick={() => (preLocked || entryState === "completed" ? handleStartNewVisit(false) : setShowStartNewVisitConfirm(true))}
            disabled={isStartingNewVisit}
            className="gap-2 flex-1 sm:flex-initial"
          >
            {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start New Visit
          </Button> */}
        </div>
      </div>

      {preLocked && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Consultation already started. Pre-consultation is locked.
          </p>
        </div>
      )}

      <AlertDialog open={showStartNewVisitConfirm} onOpenChange={setShowStartNewVisitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start new visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This visit is still active. End this visit and start a new one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowStartNewVisitConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleStartNewVisit(true)} disabled={isStartingNewVisit}>
              {isStartingNewVisit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              End & Start New Visit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Pre-Consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved data will be lost. Are you sure you want to go back?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
              No, Stay
            </Button>
            <Button onClick={handleLeaveConfirmYes} className="bg-purple-600 hover:bg-purple-700">
              Yes, Go Back
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Visit confirm dialog (commented out for later use) */}
      {/* <AlertDialog open={showCancelVisitConfirm} onOpenChange={setShowCancelVisitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This visit will be marked as cancelled and you can start a new one. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowCancelVisitConfirm(false)}>
              No, Stay
            </Button>
            <Button onClick={handleCancelVisitConfirmYes} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel Visit
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}

      {/* Pre-Consultation Sections Grid */}
      {isLoadingHistory ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading previous records...</span>
        </div>
      ) : (
        <div className={preLocked ? "space-y-6 pointer-events-none opacity-75" : "space-y-6"}>
          {/* First Row: Vitals and Chief Complaint (Most Important) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Vitals Section - Always show (fallback if template not loaded) */}
            <VitalsSection
              data={preConsultationData.vitals}
              previousRecords={previousRecords.vitals}
              onUpdate={(data: any) => updateSectionData("vitals", data)}
              quickMode={quickMode}
            />

            {/* Chief Complaint Section - Always show (fallback if template not loaded) */}
            <ChiefComplaintSection
              data={preConsultationData.chiefComplaint}
              previousRecords={previousRecords.chiefComplaint}
              onUpdate={(data: any) => updateSectionData("chiefComplaint", data)}
              quickMode={quickMode}
            />
          </div>

          {/* Second Row: History and Allergies */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Medical History Section - Show if not in Quick Mode */}
            {!quickMode && (
              <HistorySection
                data={preConsultationData.history}
                previousRecords={previousRecords.history}
                onUpdate={(data: any) => updateSectionData("history", data)}
              />
            )}

            {/* Allergies Section - Always show */}
            <AllergiesSection
              data={preConsultationData.allergies}
              previousRecords={previousRecords.allergies}
              onUpdate={(data: any) => updateSectionData("allergies", data)}
              quickMode={quickMode}
            />
          </div>

          {/* Show message if template loaded but no sections enabled */}
          {template && template.specialty_config?.sections && template.specialty_config.sections.length === 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                No sections enabled for your specialty. Please contact admin.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PreConsultationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <PreConsultationPageContent />
    </Suspense>
  );
}
