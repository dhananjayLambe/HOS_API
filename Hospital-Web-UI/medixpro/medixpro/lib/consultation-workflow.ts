/**
 * Consultation workflow type: section visibility and left-panel behavior.
 * Used to dynamically show/hide sections without page reload.
 */

import type { ConsultationWorkflowType } from "./consultation-types";

export type MainSectionId =
  | "symptoms"
  | "findings"
  | "diagnosis"
  | "medicines"
  | "investigations"
  | "instructions"
  | "follow_up"
  | "procedure";

const FULL_SECTIONS: MainSectionId[] = [
  "symptoms",
  "findings",
  "diagnosis",
  "medicines",
  "investigations",
  "instructions",
  "follow_up",
  "procedure",
];

const QUICK_RX_SECTIONS: MainSectionId[] = [
  "symptoms",
  "diagnosis",
  "medicines",
  "instructions",
  "follow_up",
];

const TEST_ONLY_SECTIONS: MainSectionId[] = [
  "symptoms",
  "diagnosis",
  "investigations",
  "instructions",
  "follow_up",
];

export function getVisibleSections(type: ConsultationWorkflowType): MainSectionId[] {
  switch (type) {
    case "QUICK_RX":
      return QUICK_RX_SECTIONS;
    case "TEST_ONLY":
      return TEST_ONLY_SECTIONS;
    default:
      return FULL_SECTIONS;
  }
}

export function isSectionVisible(type: ConsultationWorkflowType, section: MainSectionId): boolean {
  return getVisibleSections(type).includes(section);
}

/** Left panel = Doctor Notes, Medical History, Vitals. Shown for FULL and QUICK_RX; hidden for TEST_ONLY. */
export function isLeftPanelVisible(workflowType: ConsultationWorkflowType): boolean {
  return workflowType !== "TEST_ONLY";
}

/** Sections that should be expanded by default for this workflow. */
export function getDefaultExpandedSections(type: ConsultationWorkflowType): MainSectionId[] {
  switch (type) {
    case "QUICK_RX":
      return ["symptoms", "medicines"];
    case "TEST_ONLY":
      return ["symptoms", "investigations"];
    default:
      return ["symptoms"];
  }
}

export function isSymptomSectionExpandedByDefault(type: ConsultationWorkflowType): boolean {
  return true; // all workflows expand symptoms
}

export function isMedicinesSectionExpandedByDefault(type: ConsultationWorkflowType): boolean {
  return type === "QUICK_RX";
}

export function isInvestigationsSectionExpandedByDefault(type: ConsultationWorkflowType): boolean {
  return type === "TEST_ONLY";
}
