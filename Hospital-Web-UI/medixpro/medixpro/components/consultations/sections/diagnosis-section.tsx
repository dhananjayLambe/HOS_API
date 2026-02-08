"use client";

import { ClipboardList } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";

export function DiagnosisSection() {
  const { diagnosis, setDiagnosis } = useConsultationStore();

  return (
    <ConsultationSectionCard
      title="Diagnosis"
      icon={<ClipboardList className="text-muted-foreground" />}
    >
      <Textarea
        placeholder="Diagnosis / assessment (ICD code search ready for later)"
        value={diagnosis}
        onChange={(e) => setDiagnosis(e.target.value)}
        className="min-h-[80px] resize-y"
      />
    </ConsultationSectionCard>
  );
}
