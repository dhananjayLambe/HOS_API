import { HelpdeskAppointmentMockProvider } from "@/components/helpdesk/HelpdeskAppointmentMockProvider";
import { HelpdeskShell } from "@/components/helpdesk/HelpdeskShell";
import { PatientProvider } from "@/lib/patientContext";
import { EncounterProvider } from "@/lib/encounterContext";

/** Session- and role-gated UI; avoid static prerender (build failed with invalid element type on /helpdesk/*). */
export const dynamic = "force-dynamic";

export default function HelpdeskRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <EncounterProvider>
        <HelpdeskAppointmentMockProvider>
          <HelpdeskShell>{children}</HelpdeskShell>
        </HelpdeskAppointmentMockProvider>
      </EncounterProvider>
    </PatientProvider>
  );
}
