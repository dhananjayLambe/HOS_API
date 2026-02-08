"use client";

import { FileText } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";

export function InstructionsSection() {
  const { instructions, setInstructions } = useConsultationStore();

  return (
    <ConsultationSectionCard
      title="Instructions"
      icon={<FileText className="text-muted-foreground" />}
    >
      <Textarea
        placeholder="Patient instructions / advice"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        className="min-h-[80px] resize-y"
      />
    </ConsultationSectionCard>
  );
}
