"use client";

import { usePatient } from "@/lib/patientContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface SelectedPatientDisplayProps {
  variant?: "card" | "inline" | "badge";
  showLockStatus?: boolean;
  className?: string;
}

/**
 * Reusable component to display the currently selected patient
 * Can be used in any page or component within the dashboard
 * 
 * @example
 * ```tsx
 * // Card variant (default)
 * <SelectedPatientDisplay />
 * 
 * // Inline variant
 * <SelectedPatientDisplay variant="inline" />
 * 
 * // Badge variant
 * <SelectedPatientDisplay variant="badge" />
 * ```
 */
export function SelectedPatientDisplay({ 
  variant = "card", 
  showLockStatus = true,
  className 
}: SelectedPatientDisplayProps) {
  const { selectedPatient, isLocked } = usePatient();

  if (!selectedPatient) {
    return null;
  }

  const getInitials = () => {
    const firstName = selectedPatient.first_name?.[0] || "";
    const lastName = selectedPatient.last_name?.[0] || "";
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

  // Card variant - Full card display
  if (variant === "card") {
    return (
      <Card className={cn(
        "p-4 border-2",
        "bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10",
        "border-purple-300 dark:border-purple-700",
        isLocked && "border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10",
        className
      )}>
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-purple-200 dark:ring-purple-800 shrink-0">
            <AvatarFallback className="text-sm font-semibold bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-foreground truncate">
                {patientName}
              </h3>
              {showLockStatus && isLocked && (
                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {ageGender && (
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {ageGender}
                </span>
              )}
              {mobile && (
                <span className="flex items-center gap-1">
                  <span>•</span>
                  {mobile}
                </span>
              )}
              {selectedPatient.date_of_birth && (
                <span className="flex items-center gap-1">
                  <span>•</span>
                  DOB: {new Date(selectedPatient.date_of_birth).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Inline variant - Compact inline display
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Avatar className="h-8 w-8 ring-2 ring-purple-200 dark:ring-purple-800 shrink-0">
          <AvatarFallback className="text-xs font-semibold bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{patientName}</span>
          {ageGender && <span className="text-xs text-muted-foreground shrink-0">• {ageGender}</span>}
          {showLockStatus && isLocked && (
            <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
        </div>
      </div>
    );
  }

  // Badge variant - Small badge display
  if (variant === "badge") {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-2 px-3 py-1.5",
          "bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700",
          isLocked && "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700",
          className
        )}
      >
        <Avatar className="h-5 w-5 ring-1 ring-purple-200 dark:ring-purple-800">
          <AvatarFallback className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium">{patientName}</span>
        {showLockStatus && isLocked && (
          <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        )}
      </Badge>
    );
  }

  return null;
}

