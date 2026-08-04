"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import logo from "@/public/icon.png";
import { BarChart3, FileText, HelpCircle, Pill, Settings, UserCog, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { labSidebarNavItems } from "@/components/labs/labNavConfig";
import type { SidebarNavItem } from "@/lib/sidebarNavTypes";
import AnimateHeight from "react-animate-height";
import { useAuth } from "@/lib/authContext";
import { isLabAdminRole } from "@/lib/jwtUtils";
import { SmartQueue } from "@/components/smart-queue";
import { usePatient } from "@/lib/patientContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { AlertCircle, Search } from "lucide-react";
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** When true, sidebar starts below header (64px) so its top aligns with sub-header/content */
  alignBelowHeader?: boolean;
}

export type SidebarItem = SidebarNavItem;

export function Sidebar({ isOpen, setIsOpen, alignBelowHeader }: SidebarProps) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const { user, role } = useAuth();
  const { selectedPatient, triggerSearchHighlight } = usePatient();
  const router = useRouter();
  const [showPatientAlert, setShowPatientAlert] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const hideSmartQueue = pathname.startsWith("/consultations/") || isLabAdminRole(role);

  // Helper function to get user's full name
  const getUserFullName = () => {
    if (user?.first_name || user?.last_name) {
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (role?.toLowerCase() === "doctor") {
        return `Dr. ${fullName}`;
      }
      return fullName;
    }
    return "User";
  };

  // Helper function to get user's initials for avatar fallback
  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.first_name) {
      return user.first_name[0].toUpperCase();
    }
    if (user?.username) {
      return user.username[0].toUpperCase();
    }
    return "U";
  };

  // Helper function to get user's role display name
  const getRoleDisplayName = () => {
    if (role) {
      // Capitalize first letter and handle common role names
      const roleMap: Record<string, string> = {
        doctor: "Doctor",
        helpdesk: "Helpdesk",
        labadmin: "Lab Administrator",
        superadmin: "Administrator",
        patient: "Patient",
      };
      return roleMap[role.toLowerCase()] || role.charAt(0).toUpperCase() + role.slice(1);
    }
    return "User";
  };

  const displayName = getUserFullName();
  const displayRole = getRoleDisplayName();
  const initials = getUserInitials();

  const sidebarItems: SidebarItem[] = [
    {
      title: "Consultations",
      href: "/consultations",
      icon: Pill,
      submenu: [
        { title: "Pre-Consultation", href: "/consultations/pre-consultation" },
        { title: "Start-Consultation", href: "/consultations/start-consultation" },
      ],
    },
    {
      title: "Patients",
      href: "/patients",
      icon: UserRound,
    },
    {
      title: "Prescriptions",
      href: "/prescriptions",
      icon: Pill,
      submenu: [
        { title: "All Prescriptions", href: "/prescriptions" },
        { title: "Templates", href: "/doctor/templates" },
      ],
    },
    {
      title: "Lab Tests Reports",
      href: "/lab-tests-reports",
      icon: FileText,
      submenu: [
        { title: "Diagnostic Reports", href: "/lab-tests-reports" },
        {
          title: "Available Reports",
          href: "/lab-tests-reports?queue=needs_review",
        },
      ],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      submenu: [
        { title: "Profile Settings", href: "/profile" },
        { title: "General Settings", href: "/settings" },
        { title: "Working Hours", href: "/settings/hours" },
      ],
    },
    {
      title: "Staff",
      href: "/staff",
      icon: UserCog,
      submenu: [
        { title: "All Staff", href: "/staff" },
        { title: "Add Staff", href: "/staff/add" },
      ],
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
      submenu: [
        { title: "Overview", href: "/reports" },
        { title: "Appointment Reports", href: "/reports/appointments" },
      ],
    },
    {
      title: "Support",
      href: "/support",
      icon: HelpCircle,
    },
  ];

  const navItems = useMemo(() => {
    const r = role?.toLowerCase();
    if (isLabAdminRole(role)) {
      return labSidebarNavItems;
    }
    if (r === "helpdesk") {
      return sidebarItems.filter((item) => item.title !== "Staff");
    }
    return sidebarItems;
  }, [role]);

  const isSidebarLinkActive = (href: string) => {
    if (href === "/lab-dashboard/") {
      return pathname === "/lab-dashboard/" || pathname === "/lab-dashboard";
    }
    if (pathname === href) return true;
    const hrefNoSlash = href.replace(/\/$/, "");
    if (pathname === hrefNoSlash) return true;
    return pathname.startsWith(href);
  };

  const toggleSubmenu = (title: string) => {
    if (openSubmenu === title) {
      setOpenSubmenu(null);
    } else {
      setOpenSubmenu(title);
    }
  };

  // Handle consultation submenu item click with patient validation
  const handleConsultationClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setPendingNavigation(href);
      setShowPatientAlert(true);
    } else {
      router.push(href);
      if (isMobile) {
        setIsOpen(false);
      }
    }
  };

  const sidebarClasses = cn(
    "!fixed left-0 z-50 flex w-64 flex-col border-r bg-background transition-transform duration-300 ease-in-out",
    alignBelowHeader ? "!top-16 !h-[calc(100vh-4rem)]" : "bottom-0 h-full",
    {
      "translate-x-0": isOpen,
      "-translate-x-full": !isOpen,
    }
  );
  useEffect(() => {
    const foundItem = navItems.find((item) => {
      if (item.submenu) {
        return item.submenu.some((subItem) => pathname === subItem.href);
      }
      return isSidebarLinkActive(item.href);
    });
    if (foundItem?.submenu) {
      setOpenSubmenu(foundItem.title);
    }
  }, [pathname, navItems]);

  // Auto-expand Consultations only when patient is first selected (don't override user opening other submenus)
  useEffect(() => {
    if (selectedPatient && role?.toLowerCase() === "doctor") {
      const consultationsItem = sidebarItems.find((item) => item.title === "Consultations");
      if (consultationsItem) {
        setOpenSubmenu("Consultations");
      }
    }
  }, [selectedPatient, role]);
  return (
    <aside
      className={sidebarClasses}
      style={alignBelowHeader ? { top: 64, height: "calc(100vh - 64px)" } : undefined}
    >
      <div className={cn("flex items-center justify-between px-4", alignBelowHeader ? "py-2" : "py-3 xl:py-3.5")}>
        <Link href={isLabAdminRole(role) ? "/lab-dashboard/" : "/doctor-dashboard"}
          className="flex items-center space-x-2"
        >
          <Image src={logo} alt="Medixpro" width={36} height={36} />
          <span className="font-bold inline-block">MedixPro</span>
        </Link>
        <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setIsOpen(false)}>
          <X className="size-6" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      {/* Divider Line */}
      <div className="border-b border-border/50 mx-4"></div>

      {/* Smart Queue Section */}
      {!hideSmartQueue && (
        <>
          <div className="pt-2">
            <SmartQueue />
          </div>

          {/* Divider Line */}
          <div className="border-b border-border/50 mx-4 shrink-0"></div>
        </>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pt-1 pb-2">
        <nav className="space-y-1 px-2 ">
          {navItems.map((item) => (
            <div key={item.title} className="space-y-1 custom-scrollbar">
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      item.href !== "/" && pathname.startsWith(item.href) ? "bg-primary/10 text-primary" : " hover:bg-muted hover:text-foreground",
                      pathname == "/" && item.href == "/" ? "bg-primary/10 text-primary" : " hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </div>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn("h-4 w-4 transition-transform", {
                        "rotate-180": openSubmenu === item.title,
                      })}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <AnimateHeight height={openSubmenu === item.title ? "auto" : 0}>
                    <div className="ml-4 space-y-1 pl-2 pt-1">
                      {item.submenu.map((subItem) => {
                        // Special handling for Consultations submenu items
                        if (item.title === "Consultations") {
                          return (
                            <button
                              key={subItem.title}
                              onClick={(e) => handleConsultationClick(subItem.href, e)}
                              className={cn(
                                "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors text-left",
                                pathname === subItem.href ? "bg-primary/10 text-primary" : "hover:bg-muted hover:text-foreground"
                              )}
                            >
                              {subItem.title}
                            </button>
                          );
                        }
                        // Default Link behavior for other submenu items
                        return (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={cn(
                              "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                              pathname === subItem.href ? "bg-primary/10 text-primary" : "hover:bg-muted hover:text-foreground"
                            )}
                            onClick={() => isMobile && setIsOpen(false)}
                          >
                            {subItem.title}
                          </Link>
                        );
                      })}
                    </div>
                  </AnimateHeight>
                </>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isSidebarLinkActive(item.href) ? "bg-primary/10 text-primary" : " hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t p-4 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-user.jpg" alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
        </div>
      </div>

      {/* Patient Selection Alert Dialog */}
      <AlertDialog open={showPatientAlert} onOpenChange={setShowPatientAlert}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle className="text-xl">Select Patient First</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base pt-2">
              Please select a patient from the search bar at the top to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 mb-4">
            <Search className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="text-sm text-purple-900 dark:text-purple-200">
              Look for the <span className="font-semibold">"Select Patient"</span> search bar in the header
            </p>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              onClick={() => {
                setPendingNavigation(null);
                setShowPatientAlert(false);
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowPatientAlert(false);
                setPendingNavigation(null);
                triggerSearchHighlight();
              }}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white order-1 sm:order-2"
            >
              Show Search Bar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
