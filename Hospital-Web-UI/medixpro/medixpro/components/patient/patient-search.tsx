"use client";

import { useState, useEffect, useRef } from "react";
import { Search, UserPlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePatient, type Patient } from "@/lib/patientContext";
import { useMobile } from "@/hooks/use-mobile";
import axiosClient from "@/lib/axiosClient";
import { cn } from "@/lib/utils";
import { AddPatientDialog } from "./add-patient-dialog";

interface PatientSearchResult extends Patient {
  age?: number;
}

export function PatientSearch() {
  const { selectedPatient, setSelectedPatient, isLocked, highlightSearch, clearSearchHighlight } = usePatient();
  const isMobile = useMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Disable search when patient is selected
  const isSearchDisabled = !!selectedPatient;

  // Handle search highlight - focus input when highlighted
  useEffect(() => {
    if (highlightSearch && inputRef.current && !isSearchDisabled) {
      inputRef.current.focus();
      setIsOpen(true);
      // Scroll to search bar smoothly
      inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSearch, isSearchDisabled]);

  // Debounced search - only if search is not disabled
  useEffect(() => {
    if (isSearchDisabled) {
      setSearchQuery("");
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);
    } else {
      setResults([]);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, isSearchDisabled]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await axiosClient.get("/patients/search/", {
        params: { query: query.trim() },
      });
      setResults(response.data.slice(0, 5)); // Limit to 5 results
    } catch (error) {
      console.error("Patient search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPatient = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setIsOpen(false);
    setSearchQuery("");
    setResults([]);
    // Clear highlight when patient is selected
    if (highlightSearch) {
      clearSearchHighlight();
    }
  };

  const handleAddPatient = () => {
    setShowAddDialog(true);
    setIsOpen(false);
  };

  const handleClosePopover = () => {
    setIsOpen(false);
    // Clear search only if no patient was selected
    if (!selectedPatient) {
      setSearchQuery("");
      setResults([]);
    }
  };

  const handlePatientAdded = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowAddDialog(false);
  };

  const maskMobile = (mobile?: string) => {
    if (!mobile) return "N/A";
    if (mobile.length <= 4) return mobile;
    const last4 = mobile.slice(-4);
    return `+91-XXXX${last4}`;
  };

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch {
      return null;
    }
  };

  // If patient is selected, show disabled search
  if (selectedPatient) {
    return (
      <div className="relative w-full min-w-[400px]">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground/50 z-10 pointer-events-none" />
        <Input
          type="text"
          placeholder="Patient selected - Unselect to search"
          value=""
          disabled={true}
          readOnly={true}
          className={cn(
            "w-full h-11 rounded-lg pl-12 pr-4 text-base",
            "bg-muted border-2 border-muted",
            "cursor-not-allowed opacity-60",
            "text-muted-foreground"
          )}
        />
      </div>
    );
  }

  const SearchResults = () => (
    <div className="flex flex-col">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-3 border-b border-purple-200 dark:border-purple-800">
        <span className="text-sm font-medium text-foreground">Search Results</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery("");
            setResults([]);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : results.length > 0 ? (
        <ScrollArea className="max-h-[300px]">
          <div className="p-2">
            {results.map((patient) => {
              const age = calculateAge(patient.date_of_birth);
              const ageGender = age
                ? `${age}${patient.gender?.[0]?.toUpperCase() || ""}`
                : patient.gender?.[0]?.toUpperCase() || "";
              return (
                <button
                  key={patient.id}
                  onClick={() => handleSelectPatient(patient)}
                  className="w-full rounded-lg px-4 py-3 text-left hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-700 border border-transparent transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                        {patient.full_name || `${patient.first_name} ${patient.last_name}`.trim()}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                        {ageGender && <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{ageGender}</span>}
                        {patient.mobile && (
                          <>
                            <span>{maskMobile(patient.mobile)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      ) : searchQuery.trim().length >= 2 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">No patient found</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPatient}
            disabled={isLocked}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add New Patient</span>
          </Button>
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Start typing to search for patients...</p>
        </div>
      )}
      <div className="border-t border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10 p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-400 font-medium"
          onClick={handleAddPatient}
          disabled={isLocked}
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Patient</span>
        </Button>
      </div>
    </div>
  );

  // Mobile: Show search icon button that opens modal
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="icon"
          onClick={() => !isLocked && !isSearchDisabled && setShowMobileModal(true)}
          disabled={isLocked || isSearchDisabled}
          className={cn(
            "h-11 w-11 border-2 border-purple-300 dark:border-purple-700",
            "bg-purple-50 dark:bg-purple-900/20",
            "hover:bg-purple-100 dark:hover:bg-purple-900/30",
            "shadow-sm hover:shadow-md transition-all",
            (isLocked || isSearchDisabled) && "cursor-not-allowed opacity-50"
          )}
        >
          <Search className="h-5 w-5 text-purple-700 dark:text-purple-400" />
        </Button>
        <Dialog open={showMobileModal} onOpenChange={setShowMobileModal}>
          <DialogContent className="sm:max-w-[425px] p-0 gap-0">
            <div className="p-4 border-b bg-primary/5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600 dark:text-purple-400 z-10" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Search patient by name, mobile, or ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLocked}
                  className="w-full h-11 rounded-lg pl-12 pr-4 text-base border-2 border-purple-300 dark:border-purple-700 focus:border-purple-600 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 shadow-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <SearchResults />
            </div>
          </DialogContent>
        </Dialog>
        <AddPatientDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onPatientAdded={handlePatientAdded}
        />
      </>
    );
  }

  // Desktop: Show full search input with popover
  return (
    <>
      <Popover 
        open={isOpen && !isLocked && !isSearchDisabled} 
        onOpenChange={(open) => {
          // Don't allow opening if search is disabled
          if (isSearchDisabled) {
            setIsOpen(false);
            return;
          }
          // Always allow opening
          if (open) {
            setIsOpen(true);
          } else {
            // Only close if search query is empty, otherwise keep it open
            // This prevents closing when there are no results
            if (searchQuery.trim().length === 0) {
              setIsOpen(false);
            }
          }
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <div className="relative w-full min-w-[400px]">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600 dark:text-purple-400 z-10 pointer-events-none" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search patient by name, mobile, or ID"
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                // Clear highlight when user starts typing
                if (highlightSearch) {
                  clearSearchHighlight();
                }
                // Open popover when user starts typing
                if (value.trim().length > 0 && !isOpen) {
                  setIsOpen(true);
                }
              }}
              onFocus={(e) => {
                e.stopPropagation();
                if (searchQuery.trim().length > 0 || !isOpen) {
                  setIsOpen(true);
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onKeyDown={(e) => {
                // Allow Escape to close
                if (e.key === "Escape") {
                  setIsOpen(false);
                  setSearchQuery("");
                  setResults([]);
                }
                // Prevent event bubbling that might close popover
                e.stopPropagation();
              }}
              disabled={isLocked || isSearchDisabled}
              readOnly={false}
              className={cn(
                "w-full h-11 rounded-lg pl-12 pr-4 text-base",
                "bg-background border-2 border-purple-300 dark:border-purple-700",
                "focus:border-purple-600 dark:focus:border-purple-500",
                "focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20",
                "shadow-sm hover:shadow-md hover:border-purple-400 dark:hover:border-purple-600",
                "transition-all duration-200",
                "placeholder:text-muted-foreground/60",
                highlightSearch && "border-purple-600 dark:border-purple-400 ring-4 ring-purple-500/30 dark:ring-purple-400/30 shadow-lg animate-pulse",
                (isLocked || isSearchDisabled) && "cursor-not-allowed opacity-50"
              )}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[500px] p-0 shadow-xl border-2 border-purple-200 dark:border-purple-800" 
          align="start"
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus on popover open, keep focus on input
            e.preventDefault();
            inputRef.current?.focus();
          }}
          onInteractOutside={(e) => {
            // Don't close if clicking on the input
            const target = e.target as HTMLElement;
            if (target.closest('input[type="text"]')) {
              e.preventDefault();
            }
          }}
        >
          <SearchResults />
        </PopoverContent>
      </Popover>
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onPatientAdded={handlePatientAdded}
      />
    </>
  );
}

