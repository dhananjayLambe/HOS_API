"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLabSession } from "@/lib/labs/session/lab-session-context";
import { labOperationalRoleLabel } from "@/lib/labs/session/lab-role-labels";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";

/** Lab header: profile + logout only (no notifications / support / doctor settings). */
export function LabProfileMenu() {
  const { logout } = useAuth();
  const { data, isPending, isError, error, refetch } = useLabSession();

  const fullName = data
    ? [data.user.first_name, data.user.last_name].filter(Boolean).join(" ").trim() || "—"
    : "";
  const email = data?.user.email ?? "";
  const roleLabel = data ? labOperationalRoleLabel(data.lab_user.role) : "";
  const initials = data
    ? data.user.first_name && data.user.last_name
      ? `${data.user.first_name[0]}${data.user.last_name[0]}`.toUpperCase()
      : data.user.first_name?.[0]?.toUpperCase() || data.user.email?.[0]?.toUpperCase() || "U"
    : "…";
  const avatarSrc = data?.user.profile_picture?.trim() ? data.user.profile_picture : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0 rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/12 to-primary/5 p-0 shadow-sm ring-offset-background transition-colors hover:border-primary/45 hover:from-primary/18 hover:to-primary/10"
        >
          <Avatar className="h-8 w-8">
            {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground shadow-inner">
              {isPending && !data ? <span className="text-[10px]">…</span> : initials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {isPending && !data ? (
              <>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : isError ? (
              <>
                <p className="text-xs text-destructive">Session could not be loaded.</p>
                <p className="text-[10px] text-muted-foreground">{error?.message}</p>
                <button
                  type="button"
                  className="text-left text-xs font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => refetch()}
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium leading-none">{fullName}</p>
                {email ? <p className="text-xs leading-none text-muted-foreground">{email}</p> : null}
                {roleLabel ? (
                  <span className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {roleLabel}
                  </span>
                ) : null}
              </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/lab-dashboard/profile/" className="flex cursor-pointer items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="flex cursor-pointer items-center gap-2">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
