"use client";

import { LabProfileMenu } from "@/components/labs/LabProfileMenu";
import {
  labIconButton,
  labMainOffsetSidebarClosed,
  labMainOffsetSidebarOpen,
  labSearchInput,
} from "@/components/labs/labDesignTokens";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Bell, Menu, MessageCircle, Search, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DashboardHeaderProps = {
  onMenuClick: () => void;
  sidebarOpen: boolean;
};

function mockQuickAction(label: string) {
  toast.message(label, { description: "Phase 1 UI — action not wired to API yet." });
}

export function DashboardHeader({ onMenuClick, sidebarOpen }: DashboardHeaderProps) {
  const [query, setQuery] = useState("");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 px-3 pt-3 sm:px-4 sm:pt-4",
        sidebarOpen ? labMainOffsetSidebarOpen : labMainOffsetSidebarClosed,
        "xl:mr-4 xl:pr-0"
      )}
    >
      <div
        className={cn(
          "grid h-20 min-h-20 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-[#ECEBFF] bg-white/88 px-2 shadow-[0_8px_32px_rgba(124,92,252,0.06)] backdrop-blur-xl sm:gap-3 sm:px-3",
          "supports-[backdrop-filter]:bg-white/82"
        )}
      >
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(labIconButton, "border-transparent bg-transparent shadow-none hover:bg-[#F4F1FF]")}
          aria-expanded={sidebarOpen}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7C5CFC]"
            strokeWidth={2}
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders, patients, barcode…"
            className={labSearchInput}
            aria-label="Lab search"
          />
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1.5 pl-1 sm:gap-2 sm:pl-2">
          <button
            type="button"
            className={labIconButton}
            aria-label="WhatsApp (mock)"
            onClick={() => mockQuickAction("WhatsApp")}
          >
            <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <button
            type="button"
            className={labIconButton}
            aria-label="Upload (mock)"
            onClick={() => mockQuickAction("Upload")}
          >
            <Upload className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <button type="button" className={labIconButton} aria-label="Notifications">
            <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="sr-only">Notifications</span>
          </button>
          <LabProfileMenu />
        </div>
      </div>
    </header>
  );
}
