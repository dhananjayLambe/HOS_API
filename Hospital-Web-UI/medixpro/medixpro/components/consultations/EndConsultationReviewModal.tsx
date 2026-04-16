"use client";

import { Loader2 } from "lucide-react";
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
import { ClinicalSummarySection } from "./ClinicalSummarySection";
import { getWarnings, WarningsSection } from "./WarningsSection";

export interface EndConsultationReviewData {
  patient: { name: string; age: string; gender: string };
  vitals: { bp?: string; pulse?: string; temp?: string; weight?: string; height?: string };
  diagnosis: string[];
  medicines: Array<{
    name: string;
    dose_display: string;
    duration_display?: string;
    instructions?: string;
  }>;
  tests: string[];
  follow_up: string;
}

interface EndConsultationReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStay: () => void;
  onConfirmEnd: () => void;
  isEndingConsultation: boolean;
  data: EndConsultationReviewData | null;
  hasFollowUp: boolean;
}

const EMPTY_REVIEW_DATA: EndConsultationReviewData = {
  patient: { name: "Unknown patient", age: "-", gender: "-" },
  vitals: {},
  diagnosis: [],
  medicines: [],
  tests: [],
  follow_up: "As advised",
};

export function EndConsultationReviewModal({
  open,
  onOpenChange,
  onStay,
  onConfirmEnd,
  isEndingConsultation,
  data,
  hasFollowUp,
}: EndConsultationReviewModalProps) {
  const reviewData = data ?? EMPTY_REVIEW_DATA;
  const warnings = getWarnings(reviewData);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[80vh]">
        <AlertDialogHeader>
          <AlertDialogTitle>Review &amp; End Consultation</AlertDialogTitle>
          <AlertDialogDescription>
            Please review before finalizing. Changes cannot be made after this.
            {!hasFollowUp ? " Follow-up is not set; you can still continue." : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ClinicalSummarySection data={reviewData} />

        <WarningsSection warnings={warnings} />

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isEndingConsultation} onClick={onStay}>
            Stay &amp; Edit
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmEnd}
            disabled={isEndingConsultation}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isEndingConsultation ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEndingConsultation ? "Ending..." : "End Consultation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
