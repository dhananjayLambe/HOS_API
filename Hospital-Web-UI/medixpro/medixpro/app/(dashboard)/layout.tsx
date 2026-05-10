//app/(dashboard)/layout.tsx
import { ConditionalDashboardLayout } from "@/components/conditional-dashboard-layout";
import { DashboardShellProviders } from "@/components/dashboard-shell-providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShellProviders>
      <ConditionalDashboardLayout>{children}</ConditionalDashboardLayout>
    </DashboardShellProviders>
  );
}
