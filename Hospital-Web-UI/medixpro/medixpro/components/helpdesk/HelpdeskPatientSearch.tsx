"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHelpdeskQueueStore } from "@/lib/helpdeskQueueStore";
import { maskMobile } from "@/lib/helpdeskQueueStore";
import { Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

interface HelpdeskPatientSearchProps {
  onAddNew: () => void;
  onSelectPatient?: (id: string) => void;
}

export function HelpdeskPatientSearch({ onAddNew, onSelectPatient }: HelpdeskPatientSearchProps) {
  const entries = useHelpdeskQueueStore((s) => s.entries);
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(t) ||
        e.mobile.replace(/\D/g, "").includes(t.replace(/\D/g, ""))
    );
  }, [entries, q]);

  const showEmpty = q.trim().length > 0 && results.length === 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or mobile"
          className="h-11 pl-9"
          inputMode="search"
        />
      </div>

      {results.length > 0 && (
        <ul className="divide-y rounded-lg border bg-card">
          {results.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent/50"
                onClick={() => onSelectPatient?.(e.id)}
              >
                <span className="font-medium">{e.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{maskMobile(e.mobile)}</span>
              </button>
            </li>
          ))}
        </ul>
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
