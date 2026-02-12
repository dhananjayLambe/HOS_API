"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePatient } from "@/lib/patientContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Search, Thermometer, Stethoscope, ClipboardList, Pill, FlaskConical, FileText } from "lucide-react";
import { ConsultationActionBar } from "@/components/consultations/consultation-action-bar";
import { ConsultationRightMenu } from "@/components/consultations/consultation-right-menu";
import { ConsultationDetailPanel } from "@/components/consultations/consultation-detail-panel";
import { ConsultationSection } from "@/components/consultations/consultation-section";
import { ConsultationErrorBoundary } from "@/components/consultations/consultation-error-boundary";
import { FollowUpSection, ProceduresSection } from "@/components/consultations/sections";
import { useConsultationStore } from "@/store/consultationStore";
import {
  isLeftPanelVisible,
  isSectionVisible,
  isMedicinesSectionExpandedByDefault,
  isInvestigationsSectionExpandedByDefault,
} from "@/lib/consultation-workflow";

export default function StartConsultationPage() {
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);

  const setConsultationType = useConsultationStore((s) => s.setConsultationType);

  useEffect(() => {
    if (!selectedPatient) {
      setShowAlert(true);
    }
  }, [selectedPatient]);

  // Default to Full Consultation when opening the page or when switching patient
  useEffect(() => {
    if (selectedPatient) {
      setConsultationType("FULL");
    }
  }, [selectedPatient?.id, setConsultationType]);

  const handleAlertClose = () => {
    setShowAlert(false);
    router.push("/doctor-dashboard");
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
              Look for the <span className="font-semibold">"Select Patient"</span> search bar in the
              header
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

  const consultationType = useConsultationStore((s) => s.consultationType);
  const showLeftPanel = useMemo(
    () => isLeftPanelVisible(consultationType),
    [consultationType]
  );
  const medicinesDefaultOpen = useMemo(
    () => isMedicinesSectionExpandedByDefault(consultationType),
    [consultationType]
  );
  const investigationsDefaultOpen = useMemo(
    () => isInvestigationsSectionExpandedByDefault(consultationType),
    [consultationType]
  );

  const ACTION_BAR_HEIGHT = 56; // h-14 in action bar
  const HEADER_HEIGHT = 64;
  const STICKY_TOP_PANELS = ACTION_BAR_HEIGHT + 12; // 68px below action bar
  const gridCols = showLeftPanel
    ? "lg:grid-cols-[minmax(0,18%)_1fr_minmax(0,28%)]"
    : "lg:grid-cols-[1fr_minmax(0,28%)]";

  return (
    <ConsultationErrorBoundary>
      <div className="flex min-h-0 flex-1 flex-col mt-0 pt-0 overflow-x-hidden min-w-0 w-full max-w-full">
        <ConsultationActionBar />
        <div className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 min-h-0 overflow-x-hidden px-3 sm:px-4 md:px-5 lg:px-6 pt-3 sm:pt-4 pb-6 pb-safe sm:pb-8 flex flex-col overflow-y-auto lg:overflow-y-hidden">
          <div
            className={`grid w-full max-w-full min-w-0 gap-3 sm:gap-4 md:gap-5 grid-cols-1 ${gridCols} grid-rows-[auto_auto_auto] lg:grid-rows-[1fr] flex-1 min-h-0`}
            style={{ width: "100%", minWidth: 0 }}
          >
            {showLeftPanel && (
              <div
                className="min-w-0 overflow-y-auto pb-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden order-2 lg:order-none lg:sticky lg:max-h-[calc(100vh-120px)]"
                style={{ top: STICKY_TOP_PANELS } as React.CSSProperties}
              >
                <ConsultationRightMenu />
              </div>
            )}
            <div
              className="min-w-0 min-h-0 overflow-y-auto lg:overflow-y-scroll lg:max-h-[calc(100vh-120px)] pr-2 sm:pr-4 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 order-1 lg:order-none"
            >
              <div className="space-y-3 sm:space-y-4">
                {isSectionVisible(consultationType, "symptoms") && (
                  <ConsultationSection
                    type="symptoms"
                    title="Symptoms"
                    icon={<Thermometer className="text-muted-foreground" />}
                    defaultOpen
                  />
                )}
                {isSectionVisible(consultationType, "findings") && (
                  <ConsultationSection
                    type="findings"
                    title="Findings"
                    icon={<Stethoscope className="text-muted-foreground" />}
                  />
                )}
                {isSectionVisible(consultationType, "diagnosis") && (
                  <ConsultationSection
                    type="diagnosis"
                    title="Diagnosis"
                    icon={<ClipboardList className="text-muted-foreground" />}
                  />
                )}
                {isSectionVisible(consultationType, "medicines") && (
                  <ConsultationSection
                    type="medicines"
                    title="Medicines"
                    icon={<Pill className="text-muted-foreground" />}
                    defaultOpen={medicinesDefaultOpen}
                  />
                )}
                {isSectionVisible(consultationType, "investigations") && (
                  <ConsultationSection
                    type="investigations"
                    title="Investigations"
                    icon={<FlaskConical className="text-muted-foreground" />}
                    defaultOpen={investigationsDefaultOpen}
                  />
                )}
                {isSectionVisible(consultationType, "instructions") && (
                  <ConsultationSection
                    type="instructions"
                    title="Instructions"
                    icon={<FileText className="text-muted-foreground" />}
                  />
                )}
                {isSectionVisible(consultationType, "follow_up") && <FollowUpSection />}
                {isSectionVisible(consultationType, "procedure") && <ProceduresSection />}
              </div>
            </div>
            <div
              className="min-w-0 overflow-y-scroll order-3 lg:order-none lg:sticky lg:max-h-[calc(100vh-120px)] pr-2 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600"
              style={{ top: STICKY_TOP_PANELS } as React.CSSProperties}
            >
              <ConsultationDetailPanel />
            </div>
          </div>
        </div>
      </div>
    </ConsultationErrorBoundary>
  );
}
