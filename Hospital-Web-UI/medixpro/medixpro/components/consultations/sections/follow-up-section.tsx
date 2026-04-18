"use client";

import { useCallback, useEffect, useRef } from "react";
import { CalendarDays, Lock } from "lucide-react";
import { format } from "date-fns";
import {
  ConsultationSectionCard,
  type ConsultationSectionCardHandle,
} from "@/components/consultations/consultation-section-card";
import { useConsultationSectionScroll } from "@/components/consultations/consultation-section-scroll-context";
import { shouldIgnoreSectionActivationClick } from "@/lib/consultation-section-activation";
import { useConsultationStore } from "@/store/consultationStore";
import { isSectionMarkedRequired } from "@/lib/consultation-workflow";
import { cn } from "@/lib/utils";

/** Dispatched from consultation action bar: expand section + open right detail panel. */
export const EXPAND_FOLLOW_UP_SIDEBAR_EVENT =
  "medixpro:consultation-expand-follow-up-sidebar";

function parseISODateLocal(s: string): Date | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return undefined;
  const d = new Date(y, m - 1, day);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatDisplayDate(iso: string): string {
  const d = parseISODateLocal(iso);
  if (!d) return "";
  try {
    return format(d, "d MMM yyyy");
  } catch {
    return iso;
  }
}

export function FollowUpSection() {
  const sectionCardRef = useRef<ConsultationSectionCardHandle>(null);
  const {
    follow_up_date,
    consultationFinalized,
    setSelectedDetail,
    setSelectedSymptomId,
    consultationType,
    sectionValidationErrors,
  } = useConsultationStore();

  const {
    registerSectionRef,
    registerSectionCardExpander,
    activateSection,
    activeSectionKey,
  } = useConsultationSectionScroll();

  useEffect(() => {
    return registerSectionCardExpander("follow_up", () => sectionCardRef.current?.expand());
  }, [registerSectionCardExpander]);

  const locked = consultationFinalized;
  const hasDate = Boolean(follow_up_date?.trim());
  const summary = hasDate ? formatDisplayDate(follow_up_date) : "No follow-up scheduled";

  const openFollowUpDetail = useCallback(() => {
    setSelectedSymptomId(null);
    setSelectedDetail({ section: "follow_up" });
    activateSection("follow_up");
    sectionCardRef.current?.expand();
  }, [
    activateSection,
    setSelectedDetail,
    setSelectedSymptomId,
  ]);

  useEffect(() => {
    const onExpand = () => {
      openFollowUpDetail();
    };
    window.addEventListener(EXPAND_FOLLOW_UP_SIDEBAR_EVENT, onExpand);
    return () => window.removeEventListener(EXPAND_FOLLOW_UP_SIDEBAR_EVENT, onExpand);
  }, [openFollowUpDetail]);

  const handleSectionCardActivate = useCallback(() => {
    openFollowUpDetail();
  }, [openFollowUpDetail]);

  const handleSectionContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (shouldIgnoreSectionActivationClick(event.target, event.currentTarget))
        return;
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
      ref={(el) => registerSectionRef("follow_up", el)}
      id="follow-up-menu"
      role="button"
      tabIndex={0}
      onClick={handleSectionContainerClick}
      onKeyDown={handleSectionContainerKeyDown}
      className={cn(
        "ccp-mid-section scroll-mt-2 rounded-2xl cursor-pointer transition-colors hover:border-blue-300/70 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40",
        activeSectionKey === "follow_up" && "ccp-mid-section--active"
      )}
    >
      <ConsultationSectionCard
        ref={sectionCardRef}
        title="Follow-Up"
        icon={
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary dark:bg-primary/15">
            <CalendarDays className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </span>
        }
        defaultOpen={false}
        validationError={sectionValidationErrors.follow_up}
        titleRequired={isSectionMarkedRequired(consultationType, "follow_up")}
        onOpenChange={(open) => {
          if (open) {
            setSelectedSymptomId(null);
            setSelectedDetail({ section: "follow_up" });
            activateSection("follow_up");
          }
        }}
      >
        {locked && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            <Lock className="h-4 w-4 shrink-0" />
            Consultation finalized
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Summary: </span>
          {summary}
        </p>
      </ConsultationSectionCard>
    </div>
  );
}
