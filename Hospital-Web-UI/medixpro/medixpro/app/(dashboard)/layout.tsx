//app/(dashboard)/layout.tsx
import { DashboardLayout } from "@/components/dashboard-layout";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { PatientProvider } from "@/lib/patientContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <PatientProvider>
      <DashboardLayout>
        <Toaster richColors position="top-right" />
        <RadixToaster />
        {children}
      </DashboardLayout>
    </PatientProvider>
  );
}
