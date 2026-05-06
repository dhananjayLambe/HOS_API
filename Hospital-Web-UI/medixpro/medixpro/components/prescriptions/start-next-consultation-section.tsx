"use client";

import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StartNextConsultationSectionProps {
  onOpenSmartQueue: () => void;
  onSearchPatient: () => void;
}

export function StartNextConsultationSection({
  onOpenSmartQueue,
  onSearchPatient,
}: StartNextConsultationSectionProps) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Start Next Consultation</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a patient from smart queue or search manually.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" className="min-h-11 bg-violet-600 hover:bg-violet-700" onClick={onOpenSmartQueue}>
          <ArrowRight className="mr-2 h-4 w-4" />
          Smart Queue
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={onSearchPatient}>
          <Search className="mr-2 h-4 w-4" />
          Search Patient
        </Button>
      </div>
    </div>
  );
}
