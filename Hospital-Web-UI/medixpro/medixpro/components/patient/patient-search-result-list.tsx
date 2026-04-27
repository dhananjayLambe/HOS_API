"use client";

import { UserPlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";
import {
  displayPatientName,
  formatAgeGenderLine,
  maskMobileForSearch,
} from "@/lib/patientSearchDisplay";

export type PatientSearchResultListVariant = "popover" | "inline" | "sheet";

export interface PatientSearchResultListProps {
  variant: PatientSearchResultListVariant;
  query: string;
  results: PatientSearchRow[];
  isLoading: boolean;
  error?: string | null;
  onSelect: (patient: PatientSearchRow) => void;
  onAddNew: () => void;
  onAddProfile: (patient: PatientSearchRow) => void;
  onClose?: () => void;
  addProfileDisabled?: boolean;
  addNewDisabled?: boolean;
  /** When false, hide per-row "+ Add Profile" (e.g. locked doctor). */
  showAddProfile?: boolean;
  activeIndex?: number;
  onHoverIndex?: (index: number) => void;
}

const scrollAreaClass = cn(
  "max-h-[min(50vh,360px)] min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain p-2 pr-1.5",
  "[scrollbar-gutter:stable] [scrollbar-width:thin]",
  "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-purple-100/60 dark:[&::-webkit-scrollbar-track]:bg-purple-950/50",
  "[&::-webkit-scrollbar-thumb]:min-h-[40px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-300 dark:[&::-webkit-scrollbar-thumb]:bg-purple-700"
);

export function PatientSearchResultList({
  variant,
  query,
  results,
  isLoading,
  error,
  onSelect,
  onAddNew,
  onAddProfile,
  onClose,
  addProfileDisabled = false,
  addNewDisabled = false,
  showAddProfile = true,
  activeIndex = -1,
  onHoverIndex,
}: PatientSearchResultListProps) {
  const minChars = 2;
  const showEmpty = query.trim().length >= minChars && !isLoading && results.length === 0 && !error;

  const headerBorder =
    variant === "inline"
      ? "border-b border-border/80"
      : "border-b border-purple-200 dark:border-purple-800";

  const footerBorder =
    variant === "inline"
      ? "border-t border-border/80 bg-muted/30"
      : "border-t border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10";

  const rowBorder = variant === "inline" ? "border-border/70" : "border-purple-100 dark:border-purple-900/60";

  const highlightText = (text: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={`${part}-${i}`} className="rounded bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-700/40">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${i}`}>{part}</span>
      )
    );
  };

  return (
    <div className="flex flex-col">
      <div className={cn("flex items-center justify-between p-3", headerBorder)}>
        <span className="text-sm font-medium text-foreground">Search Results</span>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            type="button"
            onClick={onClose}
            aria-label="Close search results"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {error && (
        <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Searching…</span>
        </div>
      ) : results.length > 0 ? (
        <div className={scrollAreaClass}>
          {results.map((patient, index) => {
            const subtitle = formatAgeGenderLine(patient);
            const mobileLine = patient.mobile ? maskMobileForSearch(patient.mobile) : "";
            const detailLine = [subtitle, mobileLine].filter(Boolean).join(" | ");
            const isActive = activeIndex === index;
            return (
              <div key={patient.id} className={cn("mb-2 last:mb-0 rounded-lg border", rowBorder)}>
                <button
                  type="button"
                  onClick={() => onSelect(patient)}
                  onMouseEnter={() => onHoverIndex?.(index)}
                  className={cn(
                    "w-full rounded-t-lg px-4 py-3 text-left transition-all duration-200 hover:bg-accent/50 group",
                    isActive && "bg-accent/60"
                  )}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-sm text-foreground group-hover:text-purple-700 dark:group-hover:text-purple-400">
                        {highlightText(displayPatientName(patient))}
                      </p>
                      {patient.relation && (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs capitalize text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {patient.relation}
                        </span>
                      )}
                    </div>
                    {detailLine ? (
                      <p className="text-xs tabular-nums text-muted-foreground">{highlightText(detailLine)}</p>
                    ) : null}
                  </div>
                </button>
                {showAddProfile && patient.mobile && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start rounded-t-none border-t border-border/60 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 hover:text-purple-800 dark:border-purple-900/60 dark:text-purple-300 dark:hover:bg-purple-900/20"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddProfile(patient);
                    }}
                    disabled={addProfileDisabled}
                  >
                    + Add Profile
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : showEmpty ? (
        <div className="py-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">No patient found</p>
          <Button type="button" variant="outline" size="sm" onClick={onAddNew} disabled={addNewDisabled} className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span>+ Add New Patient</span>
          </Button>
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Start typing to search for patients…</p>
        </div>
      )}

      <div className={cn("p-3", footerBorder)}>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 font-medium hover:bg-accent/60"
          onClick={onAddNew}
          disabled={addNewDisabled}
        >
          <UserPlus className="h-4 w-4" />
          <span>+ Add New Patient</span>
        </Button>
      </div>
    </div>
  );
}
