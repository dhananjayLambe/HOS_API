import {
  canAdvance,
  canSubmit,
  getBlockedReason,
  getPrimaryActionForStep,
  type UploadWorkflowContext,
  type UploadWorkflowStep,
} from "@/lib/labs/reports/upload/upload-workflow-machine";
import { UPLOAD_FOOTER_Z_INDEX } from "@/lib/labs/reports/upload/upload-layout-styles";

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

export function getUploadSecondaryDisabledHint(input: UploadValidationInput): string | null {
  const reason = getUploadPrimaryDisabledReason(input);
  if (!reason) return null;
  if (reason === "Select at least one report file.") return "Add files to continue";
  if (reason === "Complete the verification checklist.") return "Complete verification";
  return reason.length > 40 ? `${reason.slice(0, 37)}…` : reason;
}

export function isUploadPrimaryEnabled(input: UploadValidationInput): boolean {
  const { step } = input;
  const action = getPrimaryActionForStep(step);
  if (!action) return false;
  if (action === "upload") return canSubmit(step, input);
  return canAdvance(step, input);
}

/** In-flow action bar — sits directly below upload content (not viewport-fixed). */
export const UPLOAD_ACTION_BAR_CLASSNAME =
  "mt-2 rounded-xl border border-[#ECEBFF] bg-[#FAF9FF] px-3 py-2.5 shadow-sm sm:px-4 sm:py-3";

/** @deprecated Fixed footer removed; use UPLOAD_ACTION_BAR_CLASSNAME (in-flow). */
export const UPLOAD_ACTION_BAR_FIXED_CLASSNAME =
  `fixed bottom-0 inset-x-0 ${UPLOAD_FOOTER_Z_INDEX} border-t border-[#ECEBFF] ` +
  "bg-[#FAF9FF]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FAF9FF]/85 " +
  "supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]";

/** @deprecated Use uploadFooterPaddingStyle from upload-layout-styles.ts */
export const UPLOAD_MAIN_BOTTOM_PADDING_CLASSNAME = "";
