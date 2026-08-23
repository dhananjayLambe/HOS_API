"use client";

import { useAuth } from "@/lib/authContext";
import { getRoleRedirectPath, isLabAdminRole } from "@/lib/jwtUtils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export function isLabDashboardPath(pathname: string) {
  return pathname === "/lab-dashboard" || pathname.startsWith("/lab-dashboard/");
}

/**
 * Blocks unauthenticated users from every `(dashboard)` / lab shell route.
 * Also keeps helpdesk users on the helpdesk queue and labadmin on `/lab-dashboard/*`.
 */
export function DashboardRoleGate({ children }: { children: React.ReactNode }) {
  const { role, sessionChecked, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowHelpdeskHere = useMemo(() => {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }, [pathname]);

  const allowLabadminOnDashboard = useMemo(() => isLabDashboardPath(pathname), [pathname]);

  const onLabPath = useMemo(() => isLabDashboardPath(pathname), [pathname]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [sessionChecked, isAuthenticated, router]);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated) return;
    if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
      router.replace("/helpdesk/queue");
    }
  }, [role, sessionChecked, isAuthenticated, router, allowHelpdeskHere]);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated) return;
    if (isLabAdminRole(role) && !allowLabadminOnDashboard) {
      router.replace("/lab-dashboard/");
    }
  }, [role, sessionChecked, isAuthenticated, router, allowLabadminOnDashboard]);

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated || !role) return;
    if (onLabPath && !isLabAdminRole(role)) {
      router.replace(getRoleRedirectPath(role));
    }
  }, [role, sessionChecked, isAuthenticated, router, onLabPath]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
    return null;
  }

  if (isLabAdminRole(role) && !allowLabadminOnDashboard) {
    return null;
  }

  if (onLabPath && role && !isLabAdminRole(role)) {
    return null;
  }

  return <>{children}</>;
}
