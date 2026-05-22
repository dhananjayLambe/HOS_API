import type { UploadWorkflowStep } from "@/lib/labs/reports/upload/upload-workflow-machine";

export type UploadStepperStepDef = {
  id: UploadWorkflowStep;
  label: string;
  shortLabel: string;
};

export const UPLOAD_STEPPER_STEPS: UploadStepperStepDef[] = [
  { id: "files", label: "Upload files", shortLabel: "Upload" },
  { id: "preview", label: "Preview", shortLabel: "Preview" },
  { id: "confirm", label: "Confirm", shortLabel: "Confirm" },
];

export function getVisibleStepperSteps(hasTaskIdInUrl: boolean): UploadStepperStepDef[] {
  return UPLOAD_STEPPER_STEPS;
}

export function stepperIndex(
  step: UploadWorkflowStep,
  hasTaskIdInUrl: boolean,
): number {
  if (step === "success" || step === "select_task") return -1;
  return UPLOAD_STEPPER_STEPS.findIndex((s) => s.id === step);
}

export function stepperItemA11y(
  index: number,
  currentIndex: number,
  submitAttempted: boolean,
  stepInvalid: boolean,
): { "aria-current"?: "step"; "aria-disabled"?: boolean } {
  if (index === currentIndex) return { "aria-current": "step" };
  if (index > currentIndex) return { "aria-disabled": true };
  if (submitAttempted && stepInvalid && index === currentIndex) {
    return { "aria-current": "step" };
  }
  return {};
}
