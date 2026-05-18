"use client";

import { DashboardHeader } from "@/components/labs/premium/DashboardHeader";
import { LabSidebar } from "@/components/labs/LabSidebar";
import {
  labMainOffsetSidebarClosed,
  labMainOffsetSidebarOpen,
  labWorkspaceBg,
} from "@/components/labs/labDesignTokens";
import { LabShellHeaderProvider } from "@/lib/labs/layout/lab-shell-header-context";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isLabDashboardHome(pathname: string): boolean {
  return pathname === "/lab-dashboard" || pathname === "/lab-dashboard/";
}

/**
 * Lab workspace shell — white canvas, floating header, floating sidebar (xl+).
 */
export function LabShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardHome = isLabDashboardHome(pathname ?? "");
  const isMobile = useMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 1200 && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mainOffset = isSidebarOpen ? labMainOffsetSidebarOpen : labMainOffsetSidebarClosed;

  return (
    <LabShellHeaderProvider>
      <div className={cn("flex min-h-screen min-h-[100dvh] w-full max-w-[100vw] flex-col gap-0 overflow-x-hidden", labWorkspaceBg)}>
        <DashboardHeader
          compact={isDashboardHome}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          sidebarOpen={isSidebarOpen}
        />
        <div className="flex min-h-0 w-full min-w-0 flex-1 items-start overflow-x-hidden">
          <div ref={sidebarRef}>
            <LabSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
          </div>
          <main
            className={cn(
              "relative min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-3 pt-2 sm:px-4 sm:pt-3 xl:mr-4",
              isDashboardHome ? "overflow-y-auto pb-3" : "overflow-y-auto pb-6 sm:pb-8 xl:pb-10",
              mainOffset,
              labWorkspaceBg,
            )}
          >
            <div
              className={cn(
                "relative z-[1]",
                isDashboardHome ? "space-y-1.5" : "space-y-6 sm:space-y-8",
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </LabShellHeaderProvider>
  );
}
