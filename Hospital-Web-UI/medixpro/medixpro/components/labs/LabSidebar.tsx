"use client";

import { labSidebarNavItems } from "@/components/labs/labNavConfig";
import {
  labSidebarIconActive,
  labSidebarIconInactive,
  labSidebarNavActive,
  labSidebarNavInactive,
  labSidebarNavIndicator,
  labSidebarShell,
} from "@/components/labs/labDesignTokens";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobile } from "@/hooks/use-mobile";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { labOperationalRoleLabel } from "@/lib/labs/session/lab-role-labels";
import { organizationInitials } from "@/lib/labs/session/lab-session-display";
import { cn } from "@/lib/utils";
import { FlaskConical, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function isLabNavActive(href: string, pathname: string) {
  if (href === "/lab-dashboard/") {
    return pathname === "/lab-dashboard/" || pathname === "/lab-dashboard";
  }
  if (pathname === href) return true;
  const hrefNoSlash = href.replace(/\/$/, "");
  if (pathname === hrefNoSlash) return true;
  return pathname.startsWith(href);
}

type LabSidebarProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export function LabSidebar({ isOpen, setIsOpen }: LabSidebarProps) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const { data, isPending, isError } = useLabSession();

  const orgDisplay = data?.organization.display_name || data?.organization.organization_name || "MedixPro";
  const orgLogo = data?.organization.logo?.trim() || "";
  const orgInitials = organizationInitials(orgDisplay);
  const branchLine = data?.branch.branch_name ?? "";
  const displayName = data
    ? [data.user.first_name, data.user.last_name].filter(Boolean).join(" ").trim() || "—"
    : "";
  const displayRole = data ? labOperationalRoleLabel(data.lab_user.role) : "";
  const initials =
    data?.user.first_name && data.user.last_name
      ? `${data.user.first_name[0]}${data.user.last_name[0]}`.toUpperCase()
      : data?.user.first_name?.[0]?.toUpperCase() || data?.user.email?.[0]?.toUpperCase() || "U";

  const sidebarClasses = cn(
    labSidebarShell,
    "transition-transform duration-300 ease-in-out",
    {
      "translate-x-0": isOpen,
      "-translate-x-full": !isOpen,
    },
  );

  return (
    <aside className={sidebarClasses}>
      <div className="flex items-center justify-between border-b border-[#ECEBFF] px-4 py-3.5 xl:py-4">
        <Link href="/lab-dashboard/" className="flex min-w-0 items-center gap-2.5" onClick={() => isMobile && setIsOpen(false)}>
          {isPending && !data ? (
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          ) : orgLogo ? (
            <Image
              src={orgLogo}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-[color:rgba(124,92,252,0.12)]"
              unoptimized
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#8E6CFF] text-xs font-bold text-white ring-1 ring-[color:rgba(124,92,252,0.12)]">
              {orgInitials}
            </div>
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            {isPending && !data ? (
              <>
                <Skeleton className="mb-1 h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : isError ? (
              <span className="text-xs font-medium text-destructive">Org unavailable</span>
            ) : (
              <>
                <span className="truncate text-sm font-semibold tracking-tight text-[#111827]">{orgDisplay}</span>
                <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border border-[color:rgba(124,92,252,0.15)] bg-[#F4F1FF] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6D4FF5]">
                  <FlaskConical className="h-3 w-3 shrink-0 text-[#7C5CFC]" aria-hidden />
                  Lab
                </span>
              </>
            )}
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-[#6B7280] hover:bg-[#F4F1FF] hover:text-[#111827] xl:hidden"
          onClick={() => setIsOpen(false)}
        >
          <X className="size-5" />
          <span className="sr-only">Close sidebar</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-3">
        <nav className="space-y-1">
          {labSidebarNavItems.map((item) => {
            const active = isLabNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex items-center", active ? labSidebarNavActive : labSidebarNavInactive)}
                onClick={() => isMobile && setIsOpen(false)}
              >
                {active ? <span className={labSidebarNavIndicator} aria-hidden /> : null}
                <item.icon className={active ? labSidebarIconActive : labSidebarIconInactive} aria-hidden />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shrink-0 border-t border-[#ECEBFF] bg-white/80 px-2 pb-3 pt-2 backdrop-blur-sm xl:px-3 xl:pb-3">
        <div className="rounded-xl border border-[#ECEBFF] bg-[#F4F1FF]/90 px-3 py-2.5 shadow-[0_4px_14px_rgba(124,92,252,0.08)]">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 ring-1 ring-[color:rgba(124,92,252,0.12)]">
              {data?.user.profile_picture?.trim() ? (
                <AvatarImage src={data.user.profile_picture} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-[#7C5CFC] to-[#8E6CFF] text-xs font-semibold text-white">
                {isPending && !data ? "…" : initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              {isPending && !data ? (
                <>
                  <Skeleton className="mb-1 h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <p className="truncate text-xs font-semibold text-[#111827]">{displayName}</p>
                  {branchLine ? (
                    <p className="truncate text-[10px] font-medium text-[#6B7280]">{branchLine}</p>
                  ) : null}
                  <span className="mt-1 inline-flex rounded-full border border-[color:rgba(124,92,252,0.12)] bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                    {displayRole || "—"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
