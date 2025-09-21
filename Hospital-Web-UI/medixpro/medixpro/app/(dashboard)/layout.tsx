//app/(dashboard)/layout.tsx
import { DashboardLayout } from "@/components/dashboard-layout";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/authContext";
import ThemeProvider from "@/lib/provider";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DashboardLayout>
          <Toaster richColors position="top-right" />
          {children}
        </DashboardLayout>
      </ThemeProvider>
    </AuthProvider>
  );
}
