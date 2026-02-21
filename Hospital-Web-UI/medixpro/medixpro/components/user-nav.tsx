"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { HelpCircle, LogOut, MessageCircle, Settings, User } from "lucide-react";
import { NotificationDropdown } from "./notification-dropdown";
import Link from "next/link";
import { useAuth } from "@/lib/authContext" 

export function UserNav() {
  const { logout, user, role } = useAuth();
  
  // Helper function to get user's full name
  const getUserFullName = () => {
    if (user?.first_name || user?.last_name) {
      const firstName = user.first_name || "";
      const lastName = user.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      return `Dr. ${fullName}`;
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

  // Helper function to get display email
  const getUserEmail = () => {
    return user?.email || user?.username || "No email";
  };

  const displayName = getUserFullName();
  const displayEmail = getUserEmail();
  const initials = getUserInitials();

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
      <NotificationDropdown />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full p-0 shrink-0 min-w-9 min-h-9 border-2 border-purple-500/60 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/40 dark:hover:bg-purple-800/50 ring-offset-background focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
          >
            <Avatar className="h-8 w-8 ring-2 ring-background">
              <AvatarFallback className="bg-purple-600 text-white dark:bg-purple-500 text-sm font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Open user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
           {/* <DropdownMenuItem>
              <Link href="/chat" className="flex items-center gap-2">
                <MessageCircle className="mr-2 h-4 w-4" />
                <span>Chat</span>
              </Link> 
            </DropdownMenuItem> */}
            <DropdownMenuItem>
              <Link href="/support" className="flex items-center gap-2">
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Support</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="flex items-center gap-2 cursor-pointer"
          >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
