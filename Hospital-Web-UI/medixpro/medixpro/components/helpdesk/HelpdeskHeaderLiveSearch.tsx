"use client";

import { Mic, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePatientSearchQuery } from "@/hooks/use-patient-search-query";
import { PatientSearchResultList } from "@/components/patient/patient-search-result-list";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import { useEffect, useRef, useState } from "react";

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
  const { query, setQuery, results, isLoading, error, reset } = usePatientSearchQuery(true);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const showPanel = isOpen && (query.trim().length > 0 || isLoading || Boolean(error));

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        placeholder="Search patients by name or mobile"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!isOpen) setIsOpen(true);
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
          results={results}
          isLoading={isLoading}
          error={error}
          onSelect={(patient) => {
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
        />
        </div>
      )}
    </div>
  );
}
