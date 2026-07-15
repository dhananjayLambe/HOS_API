import { LabDashboardProviders } from "@/components/labs/LabDashboardProviders";
import { LabOperationalGate } from "@/components/labs/LabOperationalGate";
import { DashboardShellProviders } from "@/components/dashboard-shell-providers";
import { LabShellLayout } from "@/components/labs/LabShellLayout";
import type { ReactNode } from "react";

/** Lab admin UI — standalone route tree (sibling to `app/(dashboard)/`, like `app/helpdesk/`). */
export default function LabDashboardRootLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShellProviders>
      <LabDashboardProviders>
        <LabShellLayout>
          <div className="mx-auto w-full max-w-[1600px]">
            <LabOperationalGate>{children}</LabOperationalGate>
          </div>
        </LabShellLayout>
      </LabDashboardProviders>
    </DashboardShellProviders>
  );
}
