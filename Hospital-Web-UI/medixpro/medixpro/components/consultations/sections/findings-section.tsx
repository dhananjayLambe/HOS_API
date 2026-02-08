"use client";

import { Search } from "lucide-react";
import { ConsultationSectionCard } from "@/components/consultations/consultation-section-card";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";

export function FindingsSection() {
  const { findings, setFindings } = useConsultationStore();

  return (
    <ConsultationSectionCard title="Findings" icon={<Search className="text-muted-foreground" />}>
      <Textarea
        placeholder="Physical examination findings, BP, Temp, Pulse..."
        value={findings}
        onChange={(e) => setFindings(e.target.value)}
        className="min-h-[96px] resize-y"
      />
    </ConsultationSectionCard>
  );
}
