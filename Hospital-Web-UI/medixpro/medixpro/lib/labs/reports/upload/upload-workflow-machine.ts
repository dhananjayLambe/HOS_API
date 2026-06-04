export type UploadWorkflowStep =
  | "select_task"
  | "files"
  | "preview"
  | "confirm"
  | "success";

export type UploadWorkflowContext = {
  hasTaskIdInUrl: boolean;
  /** Files with in-memory File objects (ready to upload). */
  fileCount: number;
  /** Metadata-only rows from draft restore without reselection. */
  metadataOnlyCount?: number;
  verified: boolean;
  canUpload: boolean;
  submitAttempted: boolean;
  isReupload?: boolean;
  reuploadReasonReady?: boolean;
  /** When set (e.g. 1 for re-upload), file count must match exactly to advance/submit. */
  maxFiles?: number;
};

const STEP_ORDER_WITH_TASK: UploadWorkflowStep[] = ["files", "preview", "confirm", "success"];
const STEP_ORDER_NO_TASK: UploadWorkflowStep[] = [
  "select_task",
  "files",
  "preview",
  "confirm",
  "success",
];

export function getStepOrder(hasTaskIdInUrl: boolean): UploadWorkflowStep[] {
  return hasTaskIdInUrl ? STEP_ORDER_WITH_TASK : STEP_ORDER_NO_TASK;
}

export function getNextStep(
  current: UploadWorkflowStep,
  hasTaskIdInUrl: boolean,
): UploadWorkflowStep | null {
  const order = getStepOrder(hasTaskIdInUrl);
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1] ?? null;
}

export function getPreviousStep(
  current: UploadWorkflowStep,
  hasTaskIdInUrl: boolean,
): UploadWorkflowStep | null {
  const order = getStepOrder(hasTaskIdInUrl);
  const idx = order.indexOf(current);
  if (idx <= 0) return null;
  return order[idx - 1] ?? null;
}

function fileCountValid(ctx: UploadWorkflowContext): boolean {
  if (ctx.fileCount === 0) return false;
  if (ctx.maxFiles != null && ctx.fileCount !== ctx.maxFiles) return false;
  return true;
}

export function canAdvance(step: UploadWorkflowStep, ctx: UploadWorkflowContext): boolean {
  switch (step) {
    case "select_task":
      return false;
    case "files":
      if (ctx.isReupload && !ctx.reuploadReasonReady) return false;
      return fileCountValid(ctx);
    case "preview":
      return fileCountValid(ctx);
    case "confirm":
      return false;
    case "success":
      return false;
    default:
      return false;
  }
}

export function canSubmit(step: UploadWorkflowStep, ctx: UploadWorkflowContext): boolean {
  if (step !== "confirm") return canAdvance(step, ctx);
  if (ctx.isReupload && !ctx.reuploadReasonReady) return false;
  return fileCountValid(ctx) && ctx.verified && ctx.canUpload;
}

export function getPrimaryActionForStep(step: UploadWorkflowStep): "continue" | "review_confirm" | "upload" | null {
  switch (step) {
    case "files":
      return "continue";
    case "preview":
      return "review_confirm";
    case "confirm":
      return "upload";
    default:
      return null;
  }
}

export function getBlockedReason(
  step: UploadWorkflowStep,
  ctx: UploadWorkflowContext,
  intent: "advance" | "submit",
): string | null {
  if (step === "select_task") return "Select a pending task to continue.";
  if (!ctx.canUpload && (step === "confirm" || intent === "submit")) {
    return "Your role cannot upload reports.";
  }
  if (ctx.fileCount === 0 && (ctx.metadataOnlyCount ?? 0) > 0) {
    return "Please reselect report files to continue.";
  }
  if (ctx.isReupload && ctx.maxFiles === 1 && ctx.fileCount > 1) {
    return "Re-upload accepts exactly one replacement file.";
  }
  if (ctx.fileCount === 0) {
    return ctx.isReupload
      ? "Select exactly one replacement file."
      : "Select at least one report file.";
  }
  if (ctx.isReupload && ctx.maxFiles === 1 && ctx.fileCount !== 1) {
    return "Select exactly one replacement file.";
  }
  if (ctx.isReupload && !ctx.reuploadReasonReady && (step === "files" || step === "confirm")) {
    return "Select a reason for re-upload.";
  }
  if (step === "confirm" && intent === "submit" && !ctx.verified) {
    return ctx.isReupload
      ? "Complete the re-upload verification checklist."
      : "Complete the verification checklist.";
  }
  if (intent === "advance" && !canAdvance(step, ctx)) {
    if (ctx.fileCount === 0 && (ctx.metadataOnlyCount ?? 0) > 0) {
      return "Please reselect report files to continue.";
    }
    if (ctx.isReupload && !ctx.reuploadReasonReady && step === "files") {
      return "Select a reason for re-upload.";
    }
    if (ctx.fileCount === 0) {
      return ctx.isReupload
        ? "Select exactly one replacement file."
        : "Select at least one report file.";
    }
    if (ctx.isReupload && ctx.maxFiles === 1 && ctx.fileCount !== 1) {
      return "Select exactly one replacement file.";
    }
  }
  if (intent === "submit" && step === "confirm" && !canSubmit(step, ctx)) {
    if (ctx.isReupload && !ctx.reuploadReasonReady) return "Select a reason for re-upload.";
    if (!ctx.verified) {
      return ctx.isReupload
        ? "Complete the re-upload verification checklist."
        : "Complete the verification checklist.";
    }
  }
  return null;
}
