"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/authContext";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

/** Lab header: profile + logout only (no notifications / support / doctor settings). */
export function LabProfileMenu() {
  const { logout, user, role } = useAuth();

  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || "User";
  const email = user?.email || user?.username || "";
  const initials =
    user?.first_name && user?.last_name
      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
      : user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 shrink-0 rounded-full border-2 border-primary/30 bg-gradient-to-br from-primary/12 to-primary/5 p-0 shadow-sm ring-offset-background transition-colors hover:border-primary/45 hover:from-primary/18 hover:to-primary/10"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground shadow-inner">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">Open account menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{fullName}</p>
            {email ? (
              <p className="text-xs leading-none text-muted-foreground">{email}</p>
            ) : null}
            {role ? (
              <p className="text-xs capitalize text-muted-foreground">{role.toLowerCase()}</p>
            ) : null}
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
        <DropdownMenuItem
          onClick={() => logout()}
          className="flex cursor-pointer items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
