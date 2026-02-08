//app/components/dashboard-layout.tsx
"use client";
import { Sidebar } from "@/components/sidebar";
import { UserNav } from "@/components/user-nav";
import { PatientSearchBar } from "@/components/patient/patient-search-bar";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const START_CONSULTATION_PATH = "/consultations/start-consultation";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useMobile();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isStartConsultation =
    pathname === START_CONSULTATION_PATH ||
    pathname === START_CONSULTATION_PATH + "/" ||
    pathname.endsWith("/start-consultation");

  useEffect(() => {
    if (isStartConsultation) {
      setIsSidebarOpen(false);
      return;
    }
    if (!isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isMobile, isStartConsultation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth < 1200 && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col gap-0 overflow-x-hidden w-full max-w-[100vw]">
      <header className={cn("sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 duration-300 xl:ml-64 shadow-sm m-0 w-full min-w-0", !isSidebarOpen && "xl:ml-0")}>
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 min-w-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 flex justify-start min-w-0">
            <PatientSearchBar />
          </div>
          <div className="ml-auto flex items-center space-x-4 shrink-0">
            <UserNav />
          </div>
        </div>
      </header>
      <div className={cn("flex flex-1 min-h-0 items-start w-full min-w-0 overflow-x-hidden", isStartConsultation && "min-h-0")}>
        <div ref={sidebarRef}>
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} alignBelowHeader={isStartConsultation} />
        </div>
        <main
          className={cn(
            "flex-1 duration-300 xl:ml-64 min-h-0 min-w-0 w-full max-w-full overflow-x-hidden",
            !isSidebarOpen && "xl:ml-0",
            isStartConsultation ? "flex flex-col min-h-0 !pt-0 !mt-0 !-mt-px px-0 pb-0 sm:px-2 md:px-4 xl:px-6 xl:pb-6 overflow-hidden" : "overflow-auto p-3 sm:p-4 xl:p-6"
          )}
          style={isStartConsultation ? { paddingTop: 0, marginTop: -1, minHeight: 0 } : undefined}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
