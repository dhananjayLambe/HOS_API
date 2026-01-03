"use client";

import { useState } from "react";
import { Lock, User, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePatient } from "@/lib/patientContext";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PatientContextChip() {
  const { selectedPatient, isLocked, clearPatient } = usePatient();
  const toast = useToastNotification();
  const [showDetails, setShowDetails] = useState(false);

  if (!selectedPatient) {
    return null;
  }

  const getInitials = (patient: typeof selectedPatient) => {
    if (!patient) return "P";
    const firstName = patient.first_name?.[0] || "";
    const lastName = patient.last_name?.[0] || "";
    return `${firstName}${lastName}`.toUpperCase() || "P";
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

  const maskMobile = (mobile?: string) => {
    if (!mobile) return "N/A";
    if (mobile.length <= 4) return mobile;
    const last4 = mobile.slice(-4);
    return `+91-XXXX${last4}`;
  };

  const age = calculateAge(selectedPatient.date_of_birth);
  const ageGender = age
    ? `${age}${selectedPatient.gender?.[0]?.toUpperCase() || ""}`
    : selectedPatient.gender?.[0]?.toUpperCase() || "";
  const mobile = maskMobile(selectedPatient.mobile);
  const patientName = selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim();

  const handleClearPatient = () => {
    const name = patientName;
    clearPatient();
    toast.info(`Patient "${name}" unselected`);
  };

  return (
    <>
      <div className="relative w-full">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-11 rounded-lg px-4 pr-2 gap-3 border-2 border-purple-300 dark:border-purple-700",
                  "bg-purple-50 dark:bg-purple-900/20",
                  "hover:bg-purple-100 dark:hover:bg-purple-900/30",
                  "shadow-sm hover:shadow-md transition-all duration-200",
                  "font-medium w-full justify-start",
                  isLocked && "cursor-not-allowed opacity-75 border-purple-400 dark:border-purple-600"
                )}
                onClick={() => !isLocked && setShowDetails(true)}
                disabled={isLocked}
              >
                <Avatar className="h-7 w-7 ring-2 ring-purple-200 dark:ring-purple-800 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
                    {getInitials(selectedPatient)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">{patientName}</span>
                  {ageGender && <span className="text-xs text-muted-foreground shrink-0">• {ageGender}</span>}
                  {mobile && <span className="text-xs text-muted-foreground shrink-0">• {mobile}</span>}
                </div>
                {isLocked && <Lock className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLocked ? "Patient is locked during active consultation" : "Click to view patient details"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Unselect Button */}
        {!isLocked && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleClearPatient();
            }}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7",
              "hover:bg-red-100 dark:hover:bg-red-900/30",
              "hover:text-red-600 dark:hover:text-red-400",
              "transition-colors rounded-full"
            )}
            title="Unselect patient"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {getInitials(selectedPatient)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{patientName}</h3>
                <p className="text-sm text-muted-foreground">Patient ID: {selectedPatient.id.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Age & Gender</p>
                <p className="text-sm">{ageGender || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                <p className="text-sm">{mobile}</p>
              </div>
              {selectedPatient.date_of_birth && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                  <p className="text-sm">
                    {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                  </p>
                </div>
              )}
              {selectedPatient.relation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Relation</p>
                  <p className="text-sm">{selectedPatient.relation}</p>
                </div>
              )}
            </div>
            {!isLocked && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    handleClearPatient();
                    setShowDetails(false);
                  }}
                >
                  Change Patient
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

