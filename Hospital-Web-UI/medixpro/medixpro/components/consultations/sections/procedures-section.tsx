"use client";

import { useCallback, useRef } from "react";
import { Clipboard } from "lucide-react";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { Textarea } from "@/components/ui/textarea";
import { useConsultationStore } from "@/store/consultationStore";
import { cn } from "@/lib/utils";
import { shouldIgnoreSectionActivationClick } from "@/lib/consultation-section-activation";

export function ProceduresSection() {
  const { procedures, setProcedures } = useConsultationStore();
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const {
    registerSectionRef,
    activateSection,
    activeSectionKey,
    setProcedureEditorActive,
  } = useConsultationSectionScroll();

  const handleSectionCardActivate = useCallback(() => {
    activateSection("procedure");
    sectionCardRef.current?.expand();
  }, [activateSection]);

  const handleSectionContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (shouldIgnoreSectionActivationClick(event.target, event.currentTarget)) return;
      handleSectionCardActivate();
    },
    [handleSectionCardActivate]
  );

  const handleSectionContainerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleSectionCardActivate();
    },
    [handleSectionCardActivate]
  );

  return (
    <div
      ref={(el) => registerSectionRef("procedure", el)}
      id="procedure-section"
      role="button"
      tabIndex={0}
      onClick={handleSectionContainerClick}
      onKeyDown={handleSectionContainerKeyDown}
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl cursor-pointer transition-colors hover:border-blue-300/70 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
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
            activateSection("procedure");
          }}
          onBlur={() => setProcedureEditorActive(false)}
          className="min-h-[80px] resize-y"
        />
      </ConsultationSectionCard>
    </div>
  );
}
