"use client";

import { useRef } from "react";
import { Clipboard } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";
import { cn } from "@/lib/utils";

export function ProceduresSection() {
  const { procedures, setProcedures } = useConsultationStore();
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const {
    registerSectionRef,
    scrollSectionIntoView,
    activeSectionKey,
    setProcedureEditorActive,
  } = useConsultationSectionScroll();

  return (
    <div
      ref={(el) => registerSectionRef("procedure", el)}
      id="procedure-section"
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl",
        activeSectionKey === "procedure" && "ccp-mid-section--active"
      )}
    >
      <ConsultationSectionCard
        ref={sectionCardRef}
        title="Procedures"
        icon={<Clipboard className="text-muted-foreground" />}
      >
        <Textarea
          placeholder="Procedures (optional)"
          value={procedures}
          onChange={(e) => setProcedures(e.target.value)}
          onFocus={() => {
            setProcedureEditorActive(true);
            sectionCardRef.current?.expand();
            scrollSectionIntoView("procedure");
          }}
          onBlur={() => setProcedureEditorActive(false)}
          className="min-h-[80px] resize-y"
        />
      </ConsultationSectionCard>
    </div>
  );
}
