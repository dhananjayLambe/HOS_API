"use client";

import { DashboardRoleGate } from "@/components/helpdesk/DashboardRoleGate";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { EncounterProvider } from "@/lib/encounterContext";
import { PatientProvider } from "@/lib/patientContext";
import type { ReactNode } from "react";

/**
 * Shared provider + role gate + toaster stack for authenticated app shells
 * (main `(dashboard)` tree and standalone `/lab-dashboard` tree).
 */
export function DashboardShellProviders({ children }: { children: ReactNode }) {
  return (
    <PatientProvider>
      <EncounterProvider>
        <DashboardRoleGate>
          {children}
          <Toaster richColors position="top-right" />
          <RadixToaster />
        </DashboardRoleGate>
      </EncounterProvider>
    </PatientProvider>
  );
}
