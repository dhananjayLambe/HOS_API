//app/(dashboard)/layout.tsx
import { DashboardLayout } from "@/components/dashboard-layout";
import { Toaster } from "sonner";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/authContext";
import { PatientProvider } from "@/lib/patientContext";
import ThemeProvider from "@/lib/provider";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PatientProvider>
          <DashboardLayout>
            <Toaster richColors position="top-right" />
            <RadixToaster />
            {children}
          </DashboardLayout>
        </PatientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
