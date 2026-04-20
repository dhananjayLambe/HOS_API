import { Calendar, LayoutList, Settings, Stethoscope, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface HelpdeskNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Special handling: open pre-consult flow on queue instead of navigating away */
  action?: "preconsult";
}

export const helpdeskNavItems: HelpdeskNavItem[] = [
  { label: "Queue", href: "/helpdesk/queue", icon: LayoutList },
  { label: "Pre-Consult", href: "/helpdesk/queue", icon: Stethoscope, action: "preconsult" },
  { label: "Patients", href: "/helpdesk/patients", icon: Users },
  { label: "Appointments", href: "/helpdesk/appointments", icon: Calendar },
  { label: "Settings", href: "/helpdesk/settings", icon: Settings },
];

/** Bottom nav: Queue | Pre-Consult | Patients | Appointments */
export const helpdeskBottomNavItems: HelpdeskNavItem[] = helpdeskNavItems.slice(0, 4);
