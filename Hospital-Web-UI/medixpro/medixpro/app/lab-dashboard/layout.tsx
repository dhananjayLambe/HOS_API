import { LabDashboardProviders } from "@/components/labs/LabDashboardProviders";
import { DashboardShellProviders } from "@/components/dashboard-shell-providers";
import { LabShellLayout } from "@/components/labs/LabShellLayout";
import type { ReactNode } from "react";

/** Lab admin UI — standalone route tree (sibling to `app/(dashboard)/`, like `app/helpdesk/`). */
export default function LabDashboardRootLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShellProviders>
      <LabDashboardProviders>
        <LabShellLayout>
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </LabShellLayout>
      </LabDashboardProviders>
    </DashboardShellProviders>
  );
}
