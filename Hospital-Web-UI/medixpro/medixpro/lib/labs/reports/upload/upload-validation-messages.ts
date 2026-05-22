import {
  canAdvance,
  canSubmit,
  getBlockedReason,
  getPrimaryActionForStep,
  type UploadWorkflowContext,
  type UploadWorkflowStep,
} from "@/lib/labs/reports/upload/upload-workflow-machine";

export type UploadValidationInput = UploadWorkflowContext & {
  step: UploadWorkflowStep;
};

export function getUploadPrimaryDisabledReason(input: UploadValidationInput): string | null {
  const { step } = input;
  const action = getPrimaryActionForStep(step);
  if (!action) return null;

  if (action === "upload") {
    return getBlockedReason(step, input, "submit");
  }
  return getBlockedReason(step, input, "advance");
}

export function getUploadPrimaryButtonLabel(step: UploadWorkflowStep): string {
  switch (step) {
    case "files":
      return "Continue";
    case "preview":
      return "Review & Confirm";
    case "confirm":
      return "Upload Reports";
    default:
      return "Continue";
  }
}

export function isUploadPrimaryEnabled(input: UploadValidationInput): boolean {
  const { step } = input;
  const action = getPrimaryActionForStep(step);
  if (!action) return false;
  if (action === "upload") return canSubmit(step, input);
  return canAdvance(step, input);
}

/** Fixed bottom action bar Tailwind classes (safe-area). */
export const UPLOAD_ACTION_BAR_CLASSNAME =
  "fixed bottom-0 inset-x-0 z-40 border-t border-[#ECEBFF] bg-[#FAFAFF]/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]";

export const UPLOAD_MAIN_BOTTOM_PADDING_CLASSNAME = "pb-24 supports-[padding:max(0px)]:pb-[max(6rem,env(safe-area-inset-bottom))]";
