import type { SidebarNavItem } from "@/lib/sidebarNavTypes";
import {
  CalendarCheck,
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  LayoutDashboard,
  ScanLine,
  Send,
  Settings,
  // Users,
} from "lucide-react";

/** Flat nav for labadmin — matches doctor sidebar item shape (no submenu). */
export const labSidebarNavItems: SidebarNavItem[] = [
  { title: "Dashboard", href: "/lab-dashboard/", icon: LayoutDashboard },
  { title: "Orders", href: "/lab-dashboard/orders/", icon: ClipboardList },
  { title: "Home Collections", href: "/lab-dashboard/home-collections/", icon: Home },
  { title: "Visit Appointments", href: "/lab-dashboard/visit-appointments/", icon: CalendarCheck },
  { title: "Reports", href: "/lab-dashboard/reports/", icon: FileText },
  { title: "Report Delivery", href: "/lab-dashboard/report-delivery/", icon: Send },
  // { title: "Patients", href: "/lab-dashboard/patients/", icon: Users },
  { title: "Pricing & Services", href: "/lab-dashboard/pricing/", icon: DollarSign },
  //{ title: "Settings", href: "/lab-dashboard/settings/", icon: Settings },
  //{ title: "Sample Tracking", href: "/lab-dashboard/sample-tracking/", icon: ScanLine }
];
