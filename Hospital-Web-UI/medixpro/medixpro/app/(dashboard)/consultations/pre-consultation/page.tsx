"use client";

import { useEffect, useState } from "react";
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

export default function PreConsultationPage() {
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastNotification();
  const [showAlert, setShowAlert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  
  // Get encounter_id from URL params (required for API calls)
  const [encounterId, setEncounterId] = useState<string | null>(searchParams.get("encounter_id"));
  const [isCreatingEncounter, setIsCreatingEncounter] = useState(false);

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

  // Fetch template on mount
  useEffect(() => {
    if (!template) {
      fetchTemplate();
    }
  }, [template, fetchTemplate]);

  // Auto-create encounter if missing but patient is selected
  useEffect(() => {
    if (encounterId || !selectedPatient?.id || isCreatingEncounter) return;

    const createEncounter = async () => {
      setIsCreatingEncounter(true);
      try {
        const response = await backendAxiosClient.post(
          "/consultations/pre-consult/encounter/create/",
          { patient_profile_id: selectedPatient.id }
        );

        if (response.data?.status && response.data?.data?.encounter_id) {
          const newEncounterId = response.data.data.encounter_id;
          setEncounterId(newEncounterId);
          // Update URL without page reload
          router.replace(`/consultations/pre-consultation?encounter_id=${newEncounterId}`, { scroll: false });
          toast.success("Encounter created. You can now save pre-consultation data.");
        } else {
          console.error("Unexpected response format:", response.data);
          toast.error("Failed to create encounter: Invalid response format.");
        }
      } catch (error: any) {
        console.error("Error creating encounter:", error);
        const errorMessage = error.response?.data?.message || error.message || "Unknown error";
        const statusCode = error.response?.status;
        console.error(`Status: ${statusCode}, Message: ${errorMessage}`);
        console.error("Request URL:", error.config?.url);
        toast.error(`Failed to create encounter (${statusCode || "Network Error"}): ${errorMessage}`);
      } finally {
        setIsCreatingEncounter(false);
      }
    };

    createEncounter();
  }, [selectedPatient, encounterId, isCreatingEncounter, router, toast]);

  // Load existing section data if encounter_id is available
  useEffect(() => {
    if (!encounterId) return;

    const loadExistingData = async () => {
      const sectionCodes = ["vitals", "chief_complaint", "allergies", "medical_history"];
      const sectionMap: Record<string, keyof typeof preConsultationData> = {
        vitals: "vitals",
        chief_complaint: "chiefComplaint",
        allergies: "allergies",
        medical_history: "history",
      };

      for (const sectionCode of sectionCodes) {
        try {
          const response = await backendAxiosClient.get(
            `/consultations/pre-consult/encounter/${encounterId}/section/${sectionCode}/`
          );
          if (response.data?.data) {
            const sectionKey = sectionMap[sectionCode];
            if (sectionKey) {
              setPreConsultationData((prev) => ({
                ...prev,
                [sectionKey]: response.data.data,
              }));
            }
          }
        } catch (error: any) {
          // 404 is expected if section doesn't exist yet
          if (error?.response?.status !== 404) {
            console.error(`Error loading ${sectionCode}:`, error);
          }
        }
      }
    };

    loadExistingData();
  }, [encounterId]);

  useEffect(() => {
    if (!selectedPatient) {
      setShowAlert(true);
      // Clear previous records when no patient is selected
      setPreviousRecords({
        vitals: [],
        history: [],
        allergies: [],
        chiefComplaint: [],
      });
    } else {
      // Fetch previous records from API
      fetchPreviousRecords();
    }
  }, [selectedPatient]);

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

      toast.success("Pre-consultation data saved successfully!");

      // Navigate after a short delay to show the success message
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

  const handleCancel = () => {
    router.back();
  };

  const updateSectionData = (section: keyof typeof preConsultationData, data: any) => {
    setPreConsultationData((prev) => ({
      ...prev,
      [section]: data,
    }));
  };

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
          <Link href="/doctor-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Pre-Consultation</h1>
            <p className="text-muted-foreground">Record patient information before consultation</p>
            {isCreatingEncounter && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Creating encounter...</span>
              </p>
            )}
            {!encounterId && !isCreatingEncounter && selectedPatient && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                <span>⚠️</span>
                <span>Encounter will be created automatically when you save</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Quick Mode Toggle */}
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2 flex-1 sm:flex-initial">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-initial"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">{isSaving ? "Saving..." : "Save Pre-Consultation"}</span>
              <span className="sm:hidden">{isSaving ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Pre-Consultation Sections Grid */}
      {isLoadingHistory ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading previous records...</span>
        </div>
      ) : (
        <div className="space-y-6">
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

