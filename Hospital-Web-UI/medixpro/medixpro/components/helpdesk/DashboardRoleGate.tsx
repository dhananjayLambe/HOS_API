"use client";

import { useAuth } from "@/lib/authContext";
import { getRoleRedirectPath } from "@/lib/jwtUtils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export function isLabDashboardPath(pathname: string) {
  return pathname === "/lab-dashboard" || pathname.startsWith("/lab-dashboard/");
}

/**
 * Blocks helpdesk users from the doctor `(dashboard)` shell — redirect to helpdesk queue.
 * Lab routes under `app/lab-dashboard/` (`/lab-dashboard/*`) are allowed only for labadmin; other roles are redirected away.
 * Labadmin may use `/lab-dashboard/*` or legacy `/profile` inside this layout.
 */
export function DashboardRoleGate({ children }: { children: React.ReactNode }) {
  const { role, sessionChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowHelpdeskHere = useMemo(() => {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }, [pathname]);

  const allowLabadminOnDashboard = useMemo(() => {
    return (
      isLabDashboardPath(pathname) ||
      pathname === "/profile" ||
      pathname.startsWith("/profile/")
    );
  }, [pathname]);

  const onLabPath = useMemo(() => isLabDashboardPath(pathname), [pathname]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
      router.replace("/helpdesk/queue");
    }
  }, [role, sessionChecked, router, allowHelpdeskHere]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (role?.toLowerCase() === "labadmin" && !allowLabadminOnDashboard) {
      router.replace("/lab-dashboard/");
    }
  }, [role, sessionChecked, router, allowLabadminOnDashboard]);

  useEffect(() => {
    if (!sessionChecked || !role) return;
    if (onLabPath && role.toLowerCase() !== "labadmin") {
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

  if (role?.toLowerCase() === "labadmin" && !allowLabadminOnDashboard) {
    return null;
  }

  if (onLabPath && role?.toLowerCase() !== "labadmin") {
    return null;
  }

  return <>{children}</>;
}
