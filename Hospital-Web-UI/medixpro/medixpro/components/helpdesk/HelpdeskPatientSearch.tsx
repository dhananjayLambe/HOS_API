"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePatientSearchQuery } from "@/hooks/use-patient-search-query";
import { PatientSearchResultList } from "@/components/patient/patient-search-result-list";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface HelpdeskSearchPatient {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
}

interface HelpdeskPatientSearchProps {
  onAddNew: () => void;
  onSelectPatient?: (patient: HelpdeskSearchPatient) => void;
  onAddProfile?: (patient: HelpdeskSearchPatient) => void;
  initialQuery?: string;
  /** Autofocus search on mount (e.g. patients page). */
  autoFocus?: boolean;
  className?: string;
}

function toHelpdeskPatient(p: PatientSearchRow): HelpdeskSearchPatient {
  return {
    id: p.id,
    full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    first_name: p.first_name,
    last_name: p.last_name,
    mobile: p.mobile,
  };
}

export function HelpdeskPatientSearch({
  onAddNew,
  onSelectPatient,
  onAddProfile,
  initialQuery = "",
  autoFocus = false,
  className,
}: HelpdeskPatientSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, isLoading, error, reset } = usePatientSearchQuery(true);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  useEffect(() => {
    if (autoFocus) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [autoFocus]);

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          Search Patient
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name / mobile"
            className="h-11 pl-9"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>

      <PatientSearchResultList
        variant="inline"
        query={query}
        results={results}
        isLoading={isLoading}
        error={error}
        onSelect={(p) => onSelectPatient?.(toHelpdeskPatient(p))}
        onAddNew={onAddNew}
        onAddProfile={(p) => {
          if (onAddProfile) onAddProfile(toHelpdeskPatient(p));
        }}
        onClose={() => reset()}
        addProfileDisabled={false}
        addNewDisabled={false}
        showAddProfile={Boolean(onAddProfile)}
      />
    </div>
  );
}
