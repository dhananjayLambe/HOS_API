"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePatientSearchQuery } from "@/hooks/use-patient-search-query";
import { PatientSearchResultList } from "@/components/patient/patient-search-result-list";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const RECENT_SEARCH_KEY = "helpdesk_recent_patient_searches";
const RECENT_LIMIT = 8;

export interface HelpdeskSearchPatient {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
  patient_account_id?: string;
  gender?: string;
  date_of_birth?: string;
}

interface HelpdeskPatientSearchProps {
  onAddNew: () => void;
  onSelectPatient?: (patient: HelpdeskSearchPatient) => void;
  onAddProfile?: (patient: HelpdeskSearchPatient) => void;
  initialQuery?: string;
  /** Autofocus search on mount (e.g. patients page). */
  autoFocus?: boolean;
  className?: string;
  /** Max height class for results list scroll area (default: 250px on helpdesk appointments). */
  resultsScrollMaxHeightClassName?: string;
}

function toHelpdeskPatient(p: PatientSearchRow): HelpdeskSearchPatient {
  return {
    id: p.id,
    full_name: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    first_name: p.first_name,
    last_name: p.last_name,
    mobile: p.mobile,
    patient_account_id: p.patient_account_id,
    gender: p.gender,
    date_of_birth: p.date_of_birth,
  };
}

export function HelpdeskPatientSearch({
  onAddNew,
  onSelectPatient,
  onAddProfile,
  initialQuery = "",
  autoFocus = false,
  className,
  resultsScrollMaxHeightClassName = "max-h-[250px]",
}: HelpdeskPatientSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { query, setQuery, results, isLoading, error, reset } = usePatientSearchQuery(true, 10);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentResults, setRecentResults] = useState<PatientSearchRow[]>([]);

  const persistRecent = (patient: PatientSearchRow) => {
    const next = [patient, ...recentResults.filter((row) => row.id !== patient.id)].slice(0, RECENT_LIMIT);
    setRecentResults(next);
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    } catch {
      // ignore local storage failures
    }
  };

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  useEffect(() => {
    if (autoFocus) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 100);
      return () => window.clearTimeout(t);
    }
  }, [autoFocus]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCH_KEY);
      const parsed = raw ? (JSON.parse(raw) as PatientSearchRow[]) : [];
      setRecentResults(Array.isArray(parsed) ? parsed.slice(0, RECENT_LIMIT) : []);
    } catch {
      setRecentResults([]);
    }
  }, []);

  useEffect(() => {
    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [results]);

  const visibleResults = query.trim().length >= 2 ? results : recentResults;

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
            onKeyDown={(e) => {
              if (!visibleResults.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((prev) => (prev + 1) % visibleResults.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((prev) => (prev <= 0 ? visibleResults.length - 1 : prev - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const selected = visibleResults[activeIndex] || visibleResults[0];
                if (selected) {
                  persistRecent(selected);
                  onSelectPatient?.(toHelpdeskPatient(selected));
                }
              }
            }}
            placeholder="Search by name / mobile / username"
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
        results={visibleResults}
        isLoading={isLoading}
        error={error}
        onSelect={(p) => {
          persistRecent(p);
          onSelectPatient?.(toHelpdeskPatient(p));
        }}
        onAddNew={onAddNew}
        onAddProfile={(p) => {
          if (onAddProfile) onAddProfile(toHelpdeskPatient(p));
        }}
        onClose={() => reset()}
        addProfileDisabled={false}
        addNewDisabled={false}
        showAddProfile={Boolean(onAddProfile)}
        activeIndex={activeIndex}
        onHoverIndex={setActiveIndex}
        scrollMaxHeightClassName={resultsScrollMaxHeightClassName}
      />
    </div>
  );
}
