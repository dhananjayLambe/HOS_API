"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, FileText, Save, Eye, X, MoreHorizontal, Stethoscope, CheckCircle, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConsultationStore } from "@/store/consultationStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConsultationWorkflowType } from "@/lib/consultation-types";
import { useState } from "react";

const CONSULTATION_TYPE_LABELS: Record<ConsultationWorkflowType, string> = {
  FULL: "Full Consultation",
  QUICK_RX: "Quick Prescription",
  TEST_ONLY: "Test Only Visit",
};

function isFollowUpSet(store: ReturnType<typeof useConsultationStore.getState>): boolean {
  const { follow_up_date, follow_up_interval } = store;
  return !!(follow_up_date?.trim() || follow_up_interval > 0);
}

function hasFormData(store: ReturnType<typeof useConsultationStore.getState>): boolean {
  const s = store;
  return (
    s.symptoms.length > 0 ||
    (s.findings?.trim() ?? "") !== "" ||
    (s.diagnosis?.trim() ?? "") !== "" ||
    s.medicines.length > 0 ||
    (s.investigations?.trim() ?? "") !== "" ||
    (s.instructions?.trim() ?? "") !== "" ||
    (s.procedures?.trim() ?? "") !== "" ||
    (s.follow_up_date?.trim() ?? "") !== "" ||
    s.follow_up_interval > 0 ||
    (s.follow_up_reason?.trim() ?? "") !== ""
  );
}

export function ConsultationActionBar() {
  const router = useRouter();
  const { draftStatus, setSelectedDetail, consultationType, setConsultationType } = useConsultationStore();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);
  const [showTypeChangeConfirm, setShowTypeChangeConfirm] = useState(false);
  const [pendingType, setPendingType] = useState<ConsultationWorkflowType | null>(null);

  const formatDraftTime = (date: Date | null) => {
    if (!date) return null;
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  const handleSaveDraft = () => {
    useConsultationStore.getState().setDraftStatus({
      savedAt: new Date(),
      message: "Draft saved",
    });
  };

  const handleTypeChange = (nextType: ConsultationWorkflowType) => {
    if (nextType === consultationType) return;
    if (hasFormData(useConsultationStore.getState())) {
      setPendingType(nextType);
      setShowTypeChangeConfirm(true);
    } else {
      setConsultationType(nextType);
    }
  };

  const confirmTypeChange = () => {
    if (pendingType != null) {
      setConsultationType(pendingType);
      setPendingType(null);
      setShowTypeChangeConfirm(false);
    }
  };

  const cancelTypeChange = () => {
    setPendingType(null);
    setShowTypeChangeConfirm(false);
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex h-14 min-h-14 min-w-0 shrink-0 items-center justify-between gap-2 border-b border-[#eee] bg-white px-3 sm:px-4 md:px-5 shadow-sm dark:border-border dark:bg-background">
        <div className="flex shrink-0 items-center gap-2 md:gap-3 min-h-[44px]">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back"
            onClick={() => router.back()}
            className="h-10 w-10 shrink-0 rounded-lg touch-manipulation sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg truncate min-w-0">
            <Stethoscope className="h-5 w-5 shrink-0 text-primary/80" aria-hidden />
            <span className="hidden sm:inline">Start Consultation</span>
            <span className="sm:hidden">Consultation</span>
          </span>
        </div>

        <div className="flex min-w-0 shrink items-center justify-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_button]:shrink-0">
          {/* Consultation type dropdown (before Templates) */}
          <div className="shrink-0">
            <Select
              value={consultationType || "FULL"}
              onValueChange={(v) => handleTypeChange(v as ConsultationWorkflowType)}
            >
              <SelectTrigger
                className="w-[200px] min-h-[40px] rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700 text-sm font-semibold text-foreground shadow-sm transition-colors focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:border-violet-400 dark:focus:border-violet-500 data-[state=open]:border-violet-400 dark:data-[state=open]:border-violet-500 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/30 shrink-0 gap-2 pl-3"
                aria-label="Consultation type"
              >
                <LayoutList className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" aria-hidden />
                <SelectValue placeholder="Full Consultation" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-white dark:bg-gray-900 shadow-lg min-w-[200px]">
                <SelectItem
                  value="FULL"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.FULL}
                </SelectItem>
                <SelectItem
                  value="QUICK_RX"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.QUICK_RX}
                </SelectItem>
                <SelectItem
                  value="TEST_ONLY"
                  className="rounded-lg py-2.5 font-medium focus:bg-violet-100 dark:focus:bg-violet-900/50 focus:text-violet-700 dark:focus:text-violet-300 data-[highlighted]:bg-violet-100 dark:data-[highlighted]:bg-violet-900/50 data-[highlighted]:text-violet-700 dark:data-[highlighted]:text-violet-300 cursor-pointer"
                >
                  {CONSULTATION_TYPE_LABELS.TEST_ONLY}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Desktop: Templates and actions */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
            <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Templates
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              className="gap-1.5 rounded-lg"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            {draftStatus.savedAt && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 dark:border-emerald-800 dark:bg-emerald-950/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Draft Saved – {formatDraftTime(draftStatus.savedAt)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Draft options">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View draft history</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <Button size="sm" className="gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 border-0">
              <Eye className="h-4 w-4" />
              Preview Rx
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg md:hidden min-h-[44px] touch-manipulation">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="gap-2 py-3">
                <FileText className="h-4 w-4" />
                Templates
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-3" onClick={handleSaveDraft}>
                <Save className="h-4 w-4" />
                Save Draft
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 py-3">
                <Eye className="h-4 w-4" />
                Preview Rx
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            <Button
              size="sm"
              className="gap-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] touch-manipulation md:min-h-0 border-0"
              onClick={() => {
                if (!isFollowUpSet(useConsultationStore.getState())) {
                  setShowFollowUpConfirm(true);
                  return;
                }
                // TODO: submit consultation
              }}
            >
              <CheckCircle className="h-4 w-4" />
              Complete
            </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 min-h-[44px] touch-manipulation md:min-h-0 border-0"
            onClick={() => setShowCancelConfirm(true)}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel consultation?</AlertDialogTitle>
            <AlertDialogDescription>
              Unsaved changes will be lost. Are you sure you want to leave?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                useConsultationStore.getState().reset();
                router.push("/doctor-dashboard");
              }}
            >
              Cancel consultation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFollowUpConfirm} onOpenChange={setShowFollowUpConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No follow-up scheduled</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to continue without scheduling a follow-up visit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFollowUpConfirm(false)}>
              Continue
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFollowUpConfirm(false);
                setSelectedDetail({ section: "follow_up" });
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Follow-Up
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showTypeChangeConfirm} onOpenChange={(open) => !open && cancelTypeChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change consultation type?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing consultation type will hide some sections. Data in hidden sections is kept but
              will not be shown. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTypeChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTypeChange} className="bg-blue-600 hover:bg-blue-700">
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
