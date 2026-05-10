"use client";

import { DashboardLayout } from "@/components/dashboard-layout";

/**
 * Main `(dashboard)` shell — always the doctor/admin dashboard chrome.
 * Lab lives under `app/lab-dashboard/` with its own layout + {@link LabShellLayout}.
 */
export function ConditionalDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
