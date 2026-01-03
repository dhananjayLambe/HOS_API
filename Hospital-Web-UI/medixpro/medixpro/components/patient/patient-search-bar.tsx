"use client";

import { useState } from "react";
import { PatientSearch } from "./patient-search";
import { PatientContextChip } from "./patient-context-chip";
import { usePatient } from "@/lib/patientContext";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, Lock } from "lucide-react";
import { AddPatientDialog } from "./add-patient-dialog";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";

export function PatientSearchBar() {
  const { selectedPatient, setSelectedPatient, isLocked } = usePatient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const isMobile = useMobile();

  const handlePatientAdded = (patient: any) => {
    setSelectedPatient(patient);
    setShowAddDialog(false);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Label - Inline with search */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-900/30">
          <Users className="h-4 w-4 text-purple-700 dark:text-purple-400" />
        </div>
        <label className="text-sm font-semibold text-foreground tracking-tight whitespace-nowrap">
          {selectedPatient ? "Active Patient" : "Select Patient"}
        </label>
        {isLocked && selectedPatient && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
            <Lock className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      
      {/* Search Bar - Modern width for real-time search */}
      <div className="flex-1 min-w-[400px] max-w-[500px]">
        {selectedPatient ? <PatientContextChip /> : <PatientSearch />}
      </div>
      
      {/* Add Button */}
      <Button
        onClick={() => !isLocked && !selectedPatient && setShowAddDialog(true)}
        disabled={isLocked || !!selectedPatient}
        className={cn(
          "shrink-0 gap-2 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700",
          "text-white shadow-md hover:shadow-lg transition-all",
          "border-2 border-purple-800 dark:border-purple-500",
          (isLocked || selectedPatient) && "cursor-not-allowed opacity-50"
        )}
        size="sm"
      >
        <UserPlus className="h-4 w-4" />
        <span className={cn("hidden", !isMobile && "sm:inline")}>Add Patient</span>
      </Button>
      
      <AddPatientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onPatientAdded={handlePatientAdded}
      />
    </div>
  );
}

