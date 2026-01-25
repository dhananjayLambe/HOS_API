"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatient } from "@/lib/patientContext";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, Search, Save, X, Loader2, Zap } from "lucide-react";
import Link from "next/link";
import { VitalsSection } from "@/components/consultations/vitals-section";
// @ts-expect-error - '@/components/consultations/history-section' may be missing during development
import { HistorySection } from "@/components/consultations/history-section";
// @ts-expect-error - '@/components/consultations/allergies-section' may be missing during development
import { AllergiesSection } from "@/components/consultations/allergies-section";
// @ts-expect-error - '@/components/consultations/chief-complaint-section' may be missing during development
import { ChiefComplaintSection } from "@/components/consultations/chief-complaint-section";
import axiosClient from "@/lib/axiosClient";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PreConsultationPage() {
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const toast = useToastNotification();
  const [showAlert, setShowAlert] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [quickMode, setQuickMode] = useState(false);

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
      // For UI development: Load sample data immediately
      // In production, this will be replaced with actual API call
      setIsLoadingHistory(true);
      setTimeout(() => {
        const sampleData = getSampleHistoryData();
        setPreviousRecords(sampleData);
        setIsLoadingHistory(false);
      }, 500); // Simulate API delay

      // TODO: Uncomment when API is ready
      // fetchPreviousRecords();
    }
  }, [selectedPatient]);

  const fetchPreviousRecords = async () => {
    if (!selectedPatient?.id) return;
    
    setIsLoadingHistory(true);
    try {
      // Fetch previous consultation history
      const response = await axiosClient.get(`/consultations/history/`, {
        params: {
          patient_id: selectedPatient.id,
          page_size: 10, // Get last 10 consultations
        },
      });

      if (response.data?.data) {
        // Extract pre-consultation data from previous consultations
        const records = {
          vitals: [] as any[],
          history: [] as any[],
          allergies: [] as any[],
          chiefComplaint: [] as any[],
        };

        response.data.data.forEach((consultation: any) => {
          if (consultation.pre_consultation) {
            const preConsult = consultation.pre_consultation;
            const consultationDate = consultation.started_at || consultation.created_at;

            if (preConsult.vitals) {
              records.vitals.push({
                ...preConsult.vitals,
                date: consultationDate,
                consultation_id: consultation.id,
              });
            }
            if (preConsult.history) {
              records.history.push({
                ...preConsult.history,
                date: consultationDate,
                consultation_id: consultation.id,
              });
            }
            if (preConsult.allergies) {
              records.allergies.push({
                ...preConsult.allergies,
                date: consultationDate,
                consultation_id: consultation.id,
              });
            }
            if (preConsult.chief_complaint) {
              records.chiefComplaint.push({
                complaint: preConsult.chief_complaint,
                date: consultationDate,
                consultation_id: consultation.id,
              });
            }
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

    setIsSaving(true);
    try {
      // TODO: Implement API call to save pre-consultation data
      console.log("Saving pre-consultation data:", preConsultationData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Pre-consultation data saved successfully!");
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        router.push("/doctor-dashboard");
      }, 500);
    } catch (error) {
      console.error("Error saving pre-consultation:", error);
      toast.error("Failed to save pre-consultation data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const updateSectionData = (section: keyof typeof preConsultationData, data: any) => {
    setPreConsultationData(prev => ({
      ...prev,
      [section]: data
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
            <AlertDialogAction 
              onClick={handleAlertClose}
              className="w-full sm:w-auto order-2"
            >
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
                <span className="text-xs text-muted-foreground truncate">
                  Showing: Vitals, Complaint, Allergies
                </span>
              )}
            </div>
            <Switch
              id="quick-mode"
              checked={quickMode}
              onCheckedChange={setQuickMode}
              className="shrink-0"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="gap-2 flex-1 sm:flex-initial"
            >
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
            {/* Vitals Section - Always visible */}
            <VitalsSection
              data={preConsultationData.vitals}
              previousRecords={previousRecords.vitals}
              onUpdate={(data: any) => updateSectionData('vitals', data)}
              quickMode={quickMode}
            />

            {/* Chief Complaint Section - Always visible, prominent placement */}
            <ChiefComplaintSection
              data={preConsultationData.chiefComplaint}
              previousRecords={previousRecords.chiefComplaint}
              onUpdate={(data: any) => updateSectionData('chiefComplaint', data)}
              quickMode={quickMode}
            />
          </div>

          {/* Second Row: History and Allergies */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Medical History Section - Hidden in Quick Mode */}
            {!quickMode && (
              <HistorySection
                data={preConsultationData.history}
                previousRecords={previousRecords.history}
                onUpdate={(data: any) => updateSectionData('history', data)}
              />
            )}

            {/* Allergies Section - Always visible */}
            <AllergiesSection
              data={preConsultationData.allergies}
              previousRecords={previousRecords.allergies}
              onUpdate={(data: any) => updateSectionData('allergies', data)}
              quickMode={quickMode}
            />
          </div>
        </div>
      )}
    </div>
  );
}
