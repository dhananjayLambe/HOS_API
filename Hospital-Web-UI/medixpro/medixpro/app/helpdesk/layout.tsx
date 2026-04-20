import { HelpdeskLayout } from "@/components/helpdesk/HelpdeskLayout";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { PatientProvider } from "@/lib/patientContext";

export default function HelpdeskRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <HelpdeskLayout>
        <Toaster richColors position="top-right" />
        <RadixToaster />
        {children}
      </HelpdeskLayout>
    </PatientProvider>
  );
}
