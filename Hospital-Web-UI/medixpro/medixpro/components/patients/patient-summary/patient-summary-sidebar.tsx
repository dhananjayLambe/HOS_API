"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PatientSummarySection = "overview" | "consultations" | "prescriptions" | "labs" | "timeline";

const sections: Array<{ id: PatientSummarySection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "consultations", label: "Consultations" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "labs", label: "Lab History" },
  { id: "timeline", label: "Timeline" },
];

type Props = {
  active: PatientSummarySection;
  onChange: (next: PatientSummarySection) => void;
  isMobile: boolean;
};

export function PatientSummarySidebar({ active, onChange, isMobile }: Props) {
  if (isMobile) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => (
          <Button
            key={section.id}
            variant={active === section.id ? "default" : "outline"}
            className="min-h-[44px] shrink-0 rounded-full px-4"
            onClick={() => onChange(section.id)}
          >
            {section.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <aside className="sticky top-0 h-fit w-56 border-l border-slate-200/40 pl-4">
      <nav className="space-y-0.5">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onChange(section.id)}
            className={cn(
              "relative min-h-[44px] w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
              active === section.id
                ? "border-l-2 border-primary/40 bg-primary/[0.04] font-medium text-primary"
                : "text-slate-500 hover:bg-slate-100/60 hover:text-slate-900",
            )}
          >
            {section.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
