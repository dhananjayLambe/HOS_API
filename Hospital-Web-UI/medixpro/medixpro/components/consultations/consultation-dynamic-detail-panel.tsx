"use client";

import { SymptomDetailPanel } from "@/components/consultations/symptom-detail-panel";
import { FindingDetailPanel } from "@/components/consultations/finding-detail-panel";
import { DiagnosisDetailPanel } from "@/components/consultations/diagnosis-detail-panel";
import { InstructionDetailPanel } from "@/components/consultations/instruction-detail-panel";
import { useConsultationStore } from "@/store/consultationStore";

export function ConsultationDynamicDetailPanel() {
  const { selectedSymptomId, selectedDetail } = useConsultationStore();

  if (selectedSymptomId) {
    return <SymptomDetailPanel />;
  }

  if (selectedDetail?.section === "findings") {
    return <FindingDetailPanel />;
  }

  if (selectedDetail?.section === "diagnosis") {
    return <DiagnosisDetailPanel />;
  }

  if (selectedDetail?.section === "instructions") {
    return <InstructionDetailPanel />;
  }

  // Default: show symptom placeholder panel
  return <SymptomDetailPanel />;
}

