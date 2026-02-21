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
      <header
        className={cn(
          "sticky top-0 z-40 shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 duration-300 shadow-sm m-0 min-w-0 w-full",
          "xl:ml-64 xl:w-[calc(100vw-16rem)]",
          !isSidebarOpen && "xl:ml-0 xl:w-full"
        )}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(160px,auto)] h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 min-w-0 w-full">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 overflow-x-auto flex items-center">
            <PatientSearchBar />
          </div>
          <div className="flex items-center justify-end gap-1 shrink-0 pl-2 min-w-[160px]">
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
