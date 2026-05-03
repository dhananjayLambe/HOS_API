"use client";

import { createContext, useContext } from "react";

import type { HelpdeskSearchPatient } from "@/components/helpdesk/HelpdeskPatientSearch";

export type HelpdeskAddPatientContextValue = {
  openAddPatientDialog: () => void;
  /** Opens add-patient dialog in “add profile on this mobile” mode (loads account via check-mobile). */
  openAddProfileForPatient: (patient: HelpdeskSearchPatient) => Promise<void>;
};

export const HelpdeskAddPatientContext = createContext<HelpdeskAddPatientContextValue | null>(null);

export function useHelpdeskAddPatientDialog() {
  const ctx = useContext(HelpdeskAddPatientContext);
  if (!ctx) {
    throw new Error("useHelpdeskAddPatientDialog must be used within HelpdeskLayout");
  }
  return ctx;
}
