import { Calendar, LayoutList, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface HelpdeskNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const helpdeskNavItems: HelpdeskNavItem[] = [
  { label: "Queue", href: "/helpdesk/queue", icon: LayoutList },
  { label: "Patients", href: "/helpdesk/patients", icon: Users },
  { label: "Appointments", href: "/helpdesk/appointments", icon: Calendar },
  // Phase 1: hide Settings until feature is enabled.
  // { label: "Settings", href: "/helpdesk/settings", icon: Settings },
];

/** Bottom nav: Queue | Patients | Appointments */
export const helpdeskBottomNavItems: HelpdeskNavItem[] = helpdeskNavItems.slice(0, 3);
