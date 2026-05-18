"use client";

// Phase 2: restore global cross-module search + comms actions when APIs exist.

import { LabProfileMenu } from "@/components/labs/LabProfileMenu";
import {
  labIconButton,
  labMainOffsetSidebarClosed,
  labMainOffsetSidebarOpen,
  labPageTitle,
  labTextMuted,
} from "@/components/labs/labDesignTokens";
import { Skeleton } from "@/components/ui/skeleton";
import { useLabShellHeaderRead } from "@/lib/labs/layout/lab-shell-header-context";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { labOperationalRoleLabel } from "@/lib/labs/session/lab-role-labels";
import { cn } from "@/lib/utils";
import { Bell, Menu } from "lucide-react";

type DashboardHeaderProps = {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  /** Tighter bar on lab dashboard home — more vertical room for operations grid. */
  compact?: boolean;
};

export function DashboardHeader({ onMenuClick, sidebarOpen, compact }: DashboardHeaderProps) {
  const pageHeader = useLabShellHeaderRead();
  const { data, isPending, isError } = useLabSession();

  const fullName = data
    ? [data.user.first_name, data.user.last_name].filter(Boolean).join(" ").trim() || "—"
    : "";
  const email = data?.user.email ?? "";
  const roleLabel = data ? labOperationalRoleLabel(data.lab_user.role) : "";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 px-3 sm:px-4",
        compact ? "pt-2 sm:pt-2" : "pt-3 sm:pt-4",
        sidebarOpen ? labMainOffsetSidebarOpen : labMainOffsetSidebarClosed,
        "xl:mr-4 xl:pr-0",
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 items-center justify-between gap-2 rounded-2xl border border-[#ECEBFF] bg-white/88 px-2 shadow-[0_8px_32px_rgba(124,92,252,0.06)] backdrop-blur-xl sm:gap-3 sm:px-3",
          compact ? "min-h-14 py-1.5" : "min-h-20 py-2.5",
          "supports-[backdrop-filter]:bg-white/82",
        )}
      >
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(labIconButton, "shrink-0 border-transparent bg-transparent shadow-none hover:bg-[#F4F1FF]")}
          aria-expanded={sidebarOpen}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>

        {pageHeader ? (
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <h1 className={cn(labPageTitle, "text-lg sm:text-xl")}>{pageHeader.title}</h1>
              {pageHeader.description ? (
                <p className={cn("mt-0.5 line-clamp-2 text-xs leading-snug sm:text-sm", labTextMuted)}>
                  {pageHeader.description}
                </p>
              ) : null}
            </div>
            {pageHeader.actions ? (
              <div className="hidden shrink-0 sm:flex">{pageHeader.actions}</div>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <div className="mr-1 hidden min-w-0 max-w-[200px] flex-col items-end text-right sm:flex lg:max-w-[280px]">
            {isPending && !data ? (
              <>
                <Skeleton className="mb-1 h-3.5 w-32" />
                <Skeleton className="mb-1 h-3 w-40" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </>
            ) : isError ? (
              <span className="text-[10px] text-muted-foreground">Session unavailable</span>
            ) : (
              <>
                <span className="truncate text-xs font-semibold text-[#111827]">{fullName}</span>
                {email ? <span className="truncate text-[10px] text-[#6B7280]">{email}</span> : null}
                {roleLabel ? (
                  <span className="mt-0.5 inline-flex max-w-full truncate rounded-full border border-[color:rgba(124,92,252,0.18)] bg-[#F4F1FF] px-2 py-0.5 text-[10px] font-semibold text-[#6D4FF5]">
                    {roleLabel}
                  </span>
                ) : null}
              </>
            )}
          </div>
          {pageHeader?.actions ? (
            <div className="flex shrink-0 sm:hidden">{pageHeader.actions}</div>
          ) : null}
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
