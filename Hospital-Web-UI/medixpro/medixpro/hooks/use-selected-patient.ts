"use client";

import { usePatient } from "@/lib/patientContext";
import { useMemo } from "react";

/**
 * Custom hook to easily access and work with the selected patient
 * Provides computed values and helper functions
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { 
 *     patient, 
 *     hasPatient, 
 *     patientId, 
 *     patientName,
 *     patientAge,
 *     isLocked,
 *     requirePatient 
 *   } = useSelectedPatient();
 * 
 *   if (!hasPatient) {
 *     return <div>Please select a patient first</div>;
 *   }
 * 
 *   return <div>Working with {patientName}</div>;
 * }
 * ```
 */
export function useSelectedPatient() {
  const { selectedPatient, isLocked, setSelectedPatient, clearPatient, lockPatient, unlockPatient } = usePatient();

  const hasPatient = !!selectedPatient;
  const patientId = selectedPatient?.id || null;
  const patientName = useMemo(() => {
    if (!selectedPatient) return null;
    return selectedPatient.full_name || `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim();
  }, [selectedPatient]);

  const patientAge = useMemo(() => {
    if (!selectedPatient?.date_of_birth) return null;
    try {
      const birthDate = new Date(selectedPatient.date_of_birth);
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
  }, [selectedPatient?.date_of_birth]);

  const patientMobile = selectedPatient?.mobile || null;
  const patientGender = selectedPatient?.gender || null;
  const patientDOB = selectedPatient?.date_of_birth || null;

  /**
   * Helper function to require a patient to be selected
   * Throws an error if no patient is selected (useful for operations that require a patient)
   */
  const requirePatient = () => {
    if (!selectedPatient) {
      throw new Error("No patient selected. Please select a patient first.");
    }
    return selectedPatient;
  };

  /**
   * Helper function to get patient info as a formatted string
   */
  const getPatientInfo = () => {
    if (!selectedPatient) return null;
    const parts = [patientName];
    if (patientAge) parts.push(`${patientAge}${patientGender?.[0]?.toUpperCase() || ""}`);
    if (patientMobile) {
      const last4 = patientMobile.slice(-4);
      parts.push(`+91-XXXX${last4}`);
    }
    return parts.join(" • ");
  };

  return {
    // Patient data
    patient: selectedPatient,
    hasPatient,
    patientId,
    patientName,
    patientAge,
    patientMobile,
    patientGender,
    patientDOB,
    
    // Status
    isLocked,
    
    // Actions
    setSelectedPatient,
    clearPatient,
    lockPatient,
    unlockPatient,
    
    // Helpers
    requirePatient,
    getPatientInfo,
  };
}

