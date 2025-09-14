"use client";
import { Sidebar } from "@/components/sidebar";
import { UserNav } from "@/components/user-nav";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col ">
      <header className={cn("sticky top-0 z-40 border-b bg-background duration-300 xl:ml-64", !isSidebarOpen && "xl:ml-0")}>
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu />
          </button>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav />
          </div>
        </div>
      </header>
      <div className="flex flex-1 items-start">
        <div ref={sidebarRef}>
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        </div>
        <main className={cn("flex-1 overflow-auto duration-300 p-4 xl:p-6 xl:ml-64", !isSidebarOpen && "xl:ml-0")}>{children}</main>
      </div>
    </div>
  );
}
