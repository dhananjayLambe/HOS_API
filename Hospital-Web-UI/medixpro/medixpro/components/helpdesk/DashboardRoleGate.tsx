"use client";

import { useAuth } from "@/lib/authContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

/**
 * Blocks helpdesk users from the doctor `(dashboard)` shell — redirect to helpdesk queue.
 * Allows `/profile` so helpdesk can open account settings from the helpdesk Settings link.
 */
export function DashboardRoleGate({ children }: { children: React.ReactNode }) {
  const { role, sessionChecked } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowHelpdeskHere = useMemo(() => {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }, [pathname]);

  useEffect(() => {
    if (!sessionChecked) return;
    if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
      router.replace("/helpdesk/queue");
    }
  }, [role, sessionChecked, router, allowHelpdeskHere]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
    );
  }

  if (role?.toLowerCase() === "helpdesk" && !allowHelpdeskHere) {
    return null;
  }

  return <>{children}</>;
}
