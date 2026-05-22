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

export function canAdvance(step: UploadWorkflowStep, ctx: UploadWorkflowContext): boolean {
  switch (step) {
    case "select_task":
      return false;
    case "files":
      return ctx.fileCount > 0;
    case "preview":
      return ctx.fileCount > 0;
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
  return ctx.fileCount > 0 && ctx.verified && ctx.canUpload;
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
  if (ctx.fileCount === 0) return "Select at least one report file.";
  if (step === "confirm" && intent === "submit" && !ctx.verified) {
    return "Complete the verification checklist.";
  }
  if (intent === "advance" && !canAdvance(step, ctx)) {
    if (ctx.fileCount === 0 && (ctx.metadataOnlyCount ?? 0) > 0) {
    return "Please reselect report files to continue.";
  }
  if (ctx.fileCount === 0) return "Select at least one report file.";
  }
  if (intent === "submit" && step === "confirm" && !canSubmit(step, ctx)) {
    if (!ctx.verified) return "Complete the verification checklist.";
  }
  return null;
}
