"use client";

import { DashboardRoleGate } from "@/components/helpdesk/DashboardRoleGate";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { EncounterProvider } from "@/lib/encounterContext";
import { PatientProvider } from "@/lib/patientContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Shared provider + role gate + toaster stack for authenticated app shells
 * (main `(dashboard)` tree and standalone `/lab-dashboard` tree).
 */
export function DashboardShellProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PatientProvider>
        <EncounterProvider>
          <DashboardRoleGate>
            {children}
            <Toaster richColors position="top-right" />
            <RadixToaster />
          </DashboardRoleGate>
        </EncounterProvider>
      </PatientProvider>
    </QueryClientProvider>
  );
}
