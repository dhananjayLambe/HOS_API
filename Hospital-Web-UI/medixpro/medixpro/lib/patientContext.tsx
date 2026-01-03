"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender?: string;
  date_of_birth?: string;
  mobile?: string;
  relation?: string;
}

interface PatientContextType {
  selectedPatient: Patient | null;
  isLocked: boolean;
  setSelectedPatient: (patient: Patient | null) => void;
  clearPatient: () => void;
  lockPatient: () => void;
  unlockPatient: () => void;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export function PatientProvider({ children }: { children: ReactNode }) {
  const [selectedPatient, setSelectedPatientState] = useState<Patient | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const setSelectedPatient = useCallback((patient: Patient | null) => {
    if (!isLocked) {
      setSelectedPatientState(patient);
      // Persist to localStorage
      if (patient) {
        localStorage.setItem("selected_patient", JSON.stringify(patient));
      } else {
        localStorage.removeItem("selected_patient");
      }
    }
  }, [isLocked]);

  const clearPatient = useCallback(() => {
    if (!isLocked) {
      setSelectedPatientState(null);
      localStorage.removeItem("selected_patient");
    }
  }, [isLocked]);

  const lockPatient = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockPatient = useCallback(() => {
    setIsLocked(false);
  }, []);

  // Load from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("selected_patient");
    if (stored) {
      try {
        const patient = JSON.parse(stored);
        setSelectedPatientState(patient);
      } catch (e) {
        console.error("Failed to parse stored patient", e);
      }
    }
  }, []);

  return (
    <PatientContext.Provider
      value={{
        selectedPatient,
        isLocked,
        setSelectedPatient,
        clearPatient,
        lockPatient,
        unlockPatient,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error("usePatient must be used within a PatientProvider");
  }
  return context;
}

