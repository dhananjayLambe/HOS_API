"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PatientSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onMyPatients?: () => void;
  myPatientsActive?: boolean;
  className?: string;
  placeholder?: string;
};

export function PatientSearchBar({
  value,
  onChange,
  onMyPatients,
  myPatientsActive,
  className,
  placeholder = "Search by Patient, Identifier, Mobile, Test Name, or Report Number",
}: PatientSearchBarProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div
        className={cn(
          "relative flex-1 rounded-xl border border-[hsl(var(--clinical-border-subtle))] bg-[hsl(var(--clinical-surface-section))] shadow-[0_1px_2px_0_hsl(var(--clinical-elevation-sm)/0.04)] ring-1 ring-[hsl(var(--clinical-border-subtle)/0.6)]"
        )}
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--clinical-text-meta))]" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-12 border-0 bg-transparent pl-11 text-sm shadow-none placeholder:text-[hsl(var(--clinical-text-meta))] focus-visible:ring-0"
          aria-label="Search diagnostic reports"
        />
      </div>
      {onMyPatients ? (
        <Button
          type="button"
          variant={myPatientsActive ? "default" : "outline"}
          className="h-12 shrink-0"
          onClick={onMyPatients}
        >
          My Patients
        </Button>
      ) : null}
    </div>
  );
}
