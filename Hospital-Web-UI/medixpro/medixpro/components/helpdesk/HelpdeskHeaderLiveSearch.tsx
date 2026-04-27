"use client";

import { Mic, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePatientSearchQuery } from "@/hooks/use-patient-search-query";
import { PatientSearchResultList } from "@/components/patient/patient-search-result-list";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { useEffect, useRef, useState } from "react";

const RECENT_SEARCH_KEY = "helpdesk_recent_patient_searches";
const RECENT_LIMIT = 8;

interface HelpdeskHeaderLiveSearchProps {
  onSelectPatient: (patient: PatientSearchRow) => void;
  onAddNew: () => void;
  onAddProfile: (patient: PatientSearchRow) => void;
}

export function HelpdeskHeaderLiveSearch({
  onSelectPatient,
  onAddNew,
  onAddProfile,
}: HelpdeskHeaderLiveSearchProps) {
  const { query, setQuery, results, isLoading, error, reset } = usePatientSearchQuery(true, 10);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentResults, setRecentResults] = useState<PatientSearchRow[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const persistRecent = (patient: PatientSearchRow) => {
    const next = [patient, ...recentResults.filter((row) => row.id !== patient.id)].slice(0, RECENT_LIMIT);
    setRecentResults(next);
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    } catch {
      // ignore local storage failures
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    reset();
  };

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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
  const showPanel = isOpen && (query.trim().length > 0 || isLoading || Boolean(error) || recentResults.length > 0);

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        placeholder="Search by name / mobile / username"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
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
              onSelectPatient(selected);
              handleClose();
            }
          } else if (e.key === "Escape") {
            e.preventDefault();
            handleClose();
          }
        }}
        onFocus={() => setIsOpen(true)}
        className="h-11 flex-1 rounded-full border-border bg-background pl-9 pr-11 shadow-sm"
        aria-label="Search patient"
      />
      <button
        type="button"
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Voice search (coming soon)"
      >
        <Mic className="h-4 w-4" />
      </button>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border bg-background shadow-xl">
        <PatientSearchResultList
          variant="popover"
          query={query}
          results={visibleResults}
          isLoading={isLoading}
          error={error}
          onSelect={(patient) => {
            persistRecent(patient);
            onSelectPatient(patient);
            handleClose();
          }}
          onAddNew={() => {
            onAddNew();
            handleClose();
          }}
          onAddProfile={(patient) => {
            onAddProfile(patient);
            handleClose();
          }}
          onClose={handleClose}
          showAddProfile
          activeIndex={activeIndex}
          onHoverIndex={setActiveIndex}
        />
        </div>
      )}
    </div>
  );
}
