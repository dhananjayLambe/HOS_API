import type { SidebarNavItem } from "@/lib/sidebarNavTypes";
import {
  CalendarCheck,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
} from "lucide-react";

/** Flat nav for labadmin — matches doctor sidebar item shape (no submenu). */
export const labSidebarNavItems: SidebarNavItem[] = [
  { title: "Dashboard", href: "/lab-dashboard/", icon: LayoutDashboard },
  { title: "Orders", href: "/lab-dashboard/orders/", icon: ClipboardList },
  { title: "Home Collections", href: "/lab-dashboard/home-collections/", icon: Home },
  { title: "Visit Appointments", href: "/lab-dashboard/visit-appointments/", icon: CalendarCheck },
  { title: "Reports", href: "/lab-dashboard/reports/", icon: FileText },
  { title: "Pricing & Services", href: "/lab-dashboard/pricing/", icon: DollarSign },
];
