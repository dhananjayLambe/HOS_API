"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { maskMobile } from "@/lib/helpdeskQueueStore";
import axiosClient from "@/lib/axiosClient";
import { Loader2, Search, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface HelpdeskSearchPatient {
  id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  mobile?: string;
}

interface HelpdeskPatientSearchProps {
  onAddNew: () => void;
  onSelectPatient?: (patient: HelpdeskSearchPatient) => void;
  initialQuery?: string;
}

export function HelpdeskPatientSearch({ onAddNew, onSelectPatient, initialQuery = "" }: HelpdeskPatientSearchProps) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<HelpdeskSearchPatient[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      setErrorMsg("");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get("/patients/search/", {
          params: { query: term },
        });
        setResults(Array.isArray(response.data) ? response.data.slice(0, 10) : []);
        setErrorMsg("");
      } catch {
        setResults([]);
        setErrorMsg("Search failed. Please re-login and try again.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const showEmpty = q.trim().length >= 2 && !loading && results.length === 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or mobile (min 2 chars)"
          className="h-11 pl-9"
          inputMode="search"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-lg border bg-card px-4 py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {results.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {results.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50"
                onClick={() => onSelectPatient?.(patient)}
              >
                <span className="font-medium">
                  {patient.full_name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim()}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">{maskMobile(patient.mobile || "")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {showEmpty && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">No patient found</p>
          <Button type="button" variant="secondary" className="mt-4 gap-2" onClick={onAddNew}>
            <UserPlus className="h-4 w-4" />
            Add New Patient
          </Button>
        </div>
      )}
    </div>
  );
}
