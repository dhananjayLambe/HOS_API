//app/(dashboard)/layout.tsx
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardRoleGate } from "@/components/helpdesk/DashboardRoleGate";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { PatientProvider } from "@/lib/patientContext";
import { EncounterProvider } from "@/lib/encounterContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <EncounterProvider>
        <DashboardRoleGate>
          <DashboardLayout>
            <Toaster richColors position="top-right" />
            <RadixToaster />
            {children}
          </DashboardLayout>
        </DashboardRoleGate>
      </EncounterProvider>
    </PatientProvider>
  );
}
