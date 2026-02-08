"use client";

import { Clipboard } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";

export function ProceduresSection() {
  const { procedures, setProcedures } = useConsultationStore();

  return (
    <ConsultationSectionCard
      title="Procedures"
      icon={<Clipboard className="text-muted-foreground" />}
    >
      <Textarea
        placeholder="Procedures (optional)"
        value={procedures}
        onChange={(e) => setProcedures(e.target.value)}
        className="min-h-[80px] resize-y"
      />
    </ConsultationSectionCard>
  );
}
