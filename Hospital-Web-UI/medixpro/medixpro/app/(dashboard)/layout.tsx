import { DashboardLayout } from "@/components/dashboard-layout";
import { Toaster } from "sonner";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      <Toaster richColors position="top-right" />
      {children}
    </DashboardLayout>
  );
}
