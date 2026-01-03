"use client";

import { usePatient } from "@/lib/patientContext";
import { useEffect } from "react";

/**
 * Hook to manage patient locking during consultations
 * Call lockPatient() when consultation starts
 * Call unlockPatient() when consultation ends or is paused
 */
export function useConsultationLock() {
  const { lockPatient, unlockPatient, isLocked, selectedPatient } = usePatient();

  const startConsultation = () => {
    if (!selectedPatient) {
      throw new Error("Please select a patient to continue");
    }
    lockPatient();
  };

  const endConsultation = () => {
    unlockPatient();
  };

  const pauseConsultation = () => {
    unlockPatient();
  };

  return {
    startConsultation,
    endConsultation,
    pauseConsultation,
    isLocked,
    hasPatient: !!selectedPatient,
  };
}

