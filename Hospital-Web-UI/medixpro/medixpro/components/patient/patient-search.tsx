"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePatient, type Patient } from "@/lib/patientContext";
import { useMobile } from "@/hooks/use-mobile";
import axiosClient from "@/lib/axiosClient";
import { cn } from "@/lib/utils";
import { AddPatientDialog } from "./add-patient-dialog";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { usePatientSearchQuery } from "@/hooks/use-patient-search-query";
import { PatientSearchResultList } from "./patient-search-result-list";
import type { PatientSearchRow } from "@/lib/patientSearchDisplay";

const RECENT_SEARCH_KEY = "doctor_recent_patient_searches";
const RECENT_LIMIT = 8;

interface AddDialogContext {
  prefillMobile?: string;
  isExistingAccount?: boolean;
  existingRelations?: string[];
  existingPatientAccountId?: string;
}

export function PatientSearch() {
  const { selectedPatient, setSelectedPatient, isLocked, highlightSearch, clearSearchHighlight } = usePatient();
  const toast = useToastNotification();
  const isMobile = useMobile();
  const isSearchDisabled = !!selectedPatient;

  const { query, setQuery, results, isLoading, error, reset } = usePatientSearchQuery(!isSearchDisabled, 10);

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentResults, setRecentResults] = useState<PatientSearchRow[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [addDialogContext, setAddDialogContext] = useState<AddDialogContext>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleResults = query.trim().length >= 2 ? results : recentResults;

  useEffect(() => {
    if (highlightSearch && inputRef.current && !isSearchDisabled) {
      inputRef.current.focus();
      setIsOpen(true);
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSearch, isSearchDisabled]);

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
    setActiveIndex(visibleResults.length > 0 ? 0 : -1);
  }, [query, results, recentResults, visibleResults.length]);

  const persistRecent = (patient: PatientSearchRow) => {
    const next = [patient, ...recentResults.filter((row) => row.id !== patient.id)].slice(0, RECENT_LIMIT);
    setRecentResults(next);
    try {
      localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
    } catch {
      // ignore local storage failures
    }
  };

  const handleSelectPatient = (patient: PatientSearchRow) => {
    persistRecent(patient);
    setSelectedPatient(patient as Patient);
    setIsOpen(false);
    setShowMobileModal(false);
    reset();
    if (highlightSearch) {
      clearSearchHighlight();
    }
  };

  const handleAddPatient = () => {
    setAddDialogContext({});
    setShowAddDialog(true);
    setIsOpen(false);
    setShowMobileModal(false);
  };

  const handleAddProfile = async (patient: PatientSearchRow) => {
    if (!patient.mobile) return;

    const normalizedMobile = patient.mobile.replace(/\D/g, "").slice(-10);
    if (normalizedMobile.length !== 10) {
      toast.error("Invalid mobile number for selected patient.");
      return;
    }

    let existingPatientAccountId: string | undefined;
    let existingRelations: string[] = [];
    try {
      const checkResponse = await axiosClient.post("/patients/check-mobile/", {
        mobile: normalizedMobile,
      });
      if (checkResponse.data?.exists && checkResponse.data?.patient_account_id) {
        existingPatientAccountId = checkResponse.data.patient_account_id;
        existingRelations = Array.from(
          new Set(
            (checkResponse.data?.profiles || [])
              .map((profile: { relation?: string }) => profile?.relation?.toLowerCase())
              .filter((relation: string | undefined): relation is string => Boolean(relation))
          )
        );
      }
    } catch (err) {
      console.error("Failed to resolve patient account for add profile:", err);
    }

    if (!existingPatientAccountId) {
      toast.error("Could not load account for this mobile. Please try again.");
      return;
    }

    setAddDialogContext({
      prefillMobile: normalizedMobile,
      isExistingAccount: true,
      existingRelations,
      existingPatientAccountId,
    });
    setShowAddDialog(true);
    setIsOpen(false);
    setShowMobileModal(false);
  };

  const handlePatientAdded = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowAddDialog(false);
  };

  const listProps = {
    query,
    results: visibleResults,
    isLoading,
    error,
    onSelect: handleSelectPatient,
    onAddNew: handleAddPatient,
    onAddProfile: handleAddProfile,
    addProfileDisabled: isLocked,
    addNewDisabled: isLocked,
    showAddProfile: true,
    activeIndex,
    onHoverIndex: setActiveIndex,
  } as const;

  if (selectedPatient) {
    return (
      <div className="relative w-full min-w-[400px]">
        <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          type="text"
          placeholder="Patient selected - Unselect to search"
          value=""
          disabled={true}
          readOnly={true}
          className={cn(
            "h-11 w-full cursor-not-allowed rounded-lg border-2 border-muted bg-muted pl-12 pr-4 text-base",
            "text-muted-foreground opacity-60"
          )}
        />
      </div>
    );
  }

  const SearchResults = ({ variant, onClose }: { variant: "popover" | "inline"; onClose?: () => void }) => (
    <PatientSearchResultList
      variant={variant}
      {...listProps}
      onClose={onClose}
    />
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          onClick={() => !isLocked && !isSearchDisabled && setShowMobileModal(true)}
          disabled={isLocked || isSearchDisabled}
          className={cn(
            "h-11 w-11 border-2 border-purple-300 bg-purple-50 shadow-sm transition-all hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/20 dark:hover:bg-purple-900/30",
            "hover:shadow-md",
            (isLocked || isSearchDisabled) && "cursor-not-allowed opacity-50"
          )}
        >
          <Search className="h-5 w-5 text-purple-700 dark:text-purple-400" />
        </Button>
        <Dialog
          open={showMobileModal}
          onOpenChange={(open) => {
            setShowMobileModal(open);
            if (!open) reset();
          }}
        >
          <DialogContent className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[425px]">
            <div className="border-b bg-primary/5 p-4">
              <p className="mb-2 text-sm font-semibold text-foreground">Search Patient</p>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-purple-600 dark:text-purple-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search by name / mobile"
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
                      if (selected) handleSelectPatient(selected);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setShowMobileModal(false);
                      reset();
                    }
                  }}
                  disabled={isLocked}
                  className="h-11 w-full rounded-lg border-2 border-purple-300 pl-12 pr-4 text-base shadow-sm focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 dark:border-purple-700 dark:focus:border-purple-500 dark:focus:ring-purple-400/20"
                  autoFocus
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SearchResults
                variant="inline"
                onClose={() => {
                  setShowMobileModal(false);
                  reset();
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
        <AddPatientDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onPatientAdded={handlePatientAdded}
          prefillMobile={addDialogContext.prefillMobile}
          isExistingAccount={addDialogContext.isExistingAccount}
          existingRelations={addDialogContext.existingRelations}
          existingPatientAccountId={addDialogContext.existingPatientAccountId}
        />
      </>
    );
  }

  return (
    <>
      <Popover
        open={isOpen && !isLocked && !isSearchDisabled}
        onOpenChange={(open) => {
          if (isSearchDisabled) {
            setIsOpen(false);
            return;
          }
          if (open) {
            setIsOpen(true);
          } else if (query.trim().length === 0) {
            setIsOpen(false);
          }
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <div className="relative w-full min-w-[400px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-purple-600 dark:text-purple-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search patient by name, mobile, or ID"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (highlightSearch) {
                  clearSearchHighlight();
                }
                if (value.trim().length > 0 && !isOpen) {
                  setIsOpen(true);
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                if (query.trim().length > 0 || !isOpen) {
                  setIsOpen(true);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (!visibleResults.length && e.key !== "Escape") {
                  e.stopPropagation();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % visibleResults.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((prev) => (prev <= 0 ? visibleResults.length - 1 : prev - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const selected = visibleResults[activeIndex] || visibleResults[0];
                  if (selected) handleSelectPatient(selected);
                } else if (e.key === "Escape") {
                  setIsOpen(false);
                  reset();
                }
                e.stopPropagation();
              }}
              disabled={isLocked || isSearchDisabled}
              className={cn(
                "h-11 w-full rounded-lg border-2 border-purple-300 bg-background pl-12 pr-4 text-base shadow-sm transition-all duration-200",
                "hover:border-purple-400 hover:shadow-md dark:border-purple-700 dark:hover:border-purple-600",
                "focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 dark:focus:border-purple-500 dark:focus:ring-purple-400/20",
                "placeholder:text-muted-foreground/60",
                highlightSearch &&
                  "animate-pulse border-purple-600 shadow-lg ring-4 ring-purple-500/30 dark:border-purple-400 dark:ring-purple-400/30",
                (isLocked || isSearchDisabled) && "cursor-not-allowed opacity-50"
              )}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[500px] border-2 border-purple-200 p-0 shadow-xl dark:border-purple-800"
          align="start"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('input[type="text"]')) {
              e.preventDefault();
            }
          }}
        >
          <SearchResults
            variant="popover"
            onClose={() => {
              setIsOpen(false);
              reset();
            }}
          />
        </PopoverContent>
      </Popover>
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onPatientAdded={handlePatientAdded}
        prefillMobile={addDialogContext.prefillMobile}
        isExistingAccount={addDialogContext.isExistingAccount}
        existingRelations={addDialogContext.existingRelations}
        existingPatientAccountId={addDialogContext.existingPatientAccountId}
      />
    </>
  );
}
