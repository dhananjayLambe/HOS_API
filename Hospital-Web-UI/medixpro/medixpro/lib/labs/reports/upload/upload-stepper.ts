import type { UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";

export type UploadStepperStepDef = {
  id: UploadWorkflowStep;
  label: string;
  shortLabel: string;
};

export type UploadStepStatus =
  | "upcoming"
  | "active"
  | "completed"
  | "error"
  | "loading";

export const UPLOAD_STEPPER_STEPS: UploadStepperStepDef[] = [
  { id: "files", label: "Upload files", shortLabel: "Upload" },
  { id: "preview", label: "Preview", shortLabel: "Preview" },
  { id: "confirm", label: "Confirm", shortLabel: "Confirm" },
];

export function getVisibleStepperSteps(_hasTaskIdInUrl: boolean): UploadStepperStepDef[] {
  return UPLOAD_STEPPER_STEPS;
}

export function stepperIndex(
  step: UploadWorkflowStep,
  _hasTaskIdInUrl: boolean,
): number {
  if (step === "success" || step === "select_task") return -1;
  return UPLOAD_STEPPER_STEPS.findIndex((s) => s.id === step);
}

export function resolveStepStatus(
  stepIndex: number,
  currentIndex: number,
  overrides?: Partial<Record<number, UploadStepStatus>>,
  stepInvalid = false,
): UploadStepStatus {
  if (overrides?.[stepIndex]) return overrides[stepIndex]!;
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex > currentIndex) return "upcoming";
  if (stepInvalid) return "error";
  return "active";
}

export function stepperItemA11y(
  index: number,
  currentIndex: number,
  _submitAttempted: boolean,
  stepInvalid: boolean,
  status?: UploadStepStatus,
): {
  "aria-current"?: "step";
  "aria-disabled"?: boolean;
  "aria-invalid"?: boolean;
} {
  const resolved = status ?? resolveStepStatus(index, currentIndex, undefined, stepInvalid);
  if (resolved === "active" || resolved === "error" || resolved === "loading") {
    return {
      "aria-current": "step",
      ...(resolved === "error" ? { "aria-invalid": true } : {}),
    };
  }
  if (resolved === "upcoming") return { "aria-disabled": true };
  return {};
}
