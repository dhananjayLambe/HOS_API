"use client";

import { useAuth } from "@/lib/authContext";
import { getRoleRedirectPath, isLabAdminRole } from "@/lib/jwtUtils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export function isLabDashboardPath(pathname: string) {
  return pathname === "/lab-dashboard" || pathname.startsWith("/lab-dashboard/");
}

/**
 * Blocks helpdesk users from the doctor `(dashboard)` shell — redirect to helpdesk queue.
 * Lab routes under `app/lab-dashboard/` (`/lab-dashboard/*`) are allowed only for labadmin; other roles are redirected away.
 * Labadmin may only use `/lab-dashboard/*` — not doctor `(dashboard)` routes (including `/profile`).
 */
export function DashboardRoleGate({ children }: { children: React.ReactNode }) {
  const { role, sessionChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowHelpdeskHere = useMemo(() => {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }, [pathname]);

  const allowLabadminOnDashboard = useMemo(() => isLabDashboardPath(pathname), [pathname]);

  const onLabPath = useMemo(() => isLabDashboardPath(pathname), [pathname]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
      router.replace("/helpdesk/queue");
    }
  }, [role, sessionChecked, router, allowHelpdeskHere]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (isLabAdminRole(role) && !allowLabadminOnDashboard) {
      router.replace("/lab-dashboard/");
    }
  }, [role, sessionChecked, router, allowLabadminOnDashboard]);

  useEffect(() => {
    if (!sessionChecked || !role) return;
    if (onLabPath && !isLabAdminRole(role)) {
      router.replace(getRoleRedirectPath(role));
    }
  }, [role, sessionChecked, router, onLabPath]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
    return null;
  }

  if (isLabAdminRole(role) && !allowLabadminOnDashboard) {
    return null;
  }

  if (onLabPath && !isLabAdminRole(role)) {
    return null;
  }

  return <>{children}</>;
}
