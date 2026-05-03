"use client";

import { createContext, useContext } from "react";

export type HelpdeskAddPatientContextValue = {
  openAddPatientDialog: () => void;
};

export const HelpdeskAddPatientContext = createContext<HelpdeskAddPatientContextValue | null>(null);

export function useHelpdeskAddPatientDialog() {
  const ctx = useContext(HelpdeskAddPatientContext);
  if (!ctx) {
    throw new Error("useHelpdeskAddPatientDialog must be used within HelpdeskLayout");
  }
  return ctx;
}
