"use client";

import { FlaskConical } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";

export function InvestigationsSection() {
  const { investigations, setInvestigations } = useConsultationStore();

  return (
    <ConsultationSectionCard
      title="Investigations"
      icon={<FlaskConical className="text-muted-foreground" />}
    >
      <Textarea
        placeholder="Lab tests / investigations"
        value={investigations}
        onChange={(e) => setInvestigations(e.target.value)}
        className="min-h-[80px] resize-y"
      />
    </ConsultationSectionCard>
  );
}
