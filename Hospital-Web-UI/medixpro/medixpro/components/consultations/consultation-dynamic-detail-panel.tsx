"use client";

import { SymptomDetailPanel } from "@/components/consultations/symptom-detail-panel";
import { FindingDetailPanel } from "@/components/consultations/finding-detail-panel";
import { DiagnosisDetailPanel } from "@/components/consultations/diagnosis-detail-panel";
import { InstructionDetailPanel } from "@/components/consultations/instruction-detail-panel";
import { MedicineDetailPanel } from "@/components/consultations/medicine-detail-panel";
import { InvestigationDetailPanel } from "@/components/consultations/investigation-detail-panel";
import { FollowUpDetailPanel } from "@/components/consultations/follow-up-detail-panel";
import { useConsultationStore } from "@/store/consultationStore";

export function ConsultationDynamicDetailPanel() {
  const { selectedSymptomId, selectedDetail } = useConsultationStore();

  // When user selects an item from findings/diagnosis/instructions/medicines, show that panel
  // (check selectedDetail first so the right panel shows even if a symptom was selected earlier)
  if (selectedDetail?.section === "follow_up") {
    return <FollowUpDetailPanel />;
  }
  if (selectedDetail?.section === "medicines") {
    return <MedicineDetailPanel />;
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
  if (selectedDetail?.section === "investigations") {
    return <InvestigationDetailPanel />;
  }

  if (selectedSymptomId) {
    return <SymptomDetailPanel />;
  }

  // Default: show symptom placeholder panel
  return <SymptomDetailPanel />;
}

