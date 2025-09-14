"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Notification, NotificationItem } from "./notification-item";

// Sample notification data
const initialNotifications: Notification[] = [
  {
    id: "1",
    title: "New appointment request",
    description: "Dr. Smith has a new appointment request from John Doe",
    time: "Just now",
    read: false,
    type: "appointment",
  },
  {
    id: "2",
    title: "Prescription renewal",
    description: "Patient Emily Johnson requested a prescription renewal",
    time: "5 min ago",
    read: false,
    type: "prescription",
  },
  {
    id: "3",
    title: "Lab results available",
    description: "New lab results are available for patient Michael Brown",
    time: "1 hour ago",
    read: false,
    type: "system",
  },
  {
    id: "4",
    title: "New message",
    description: "You have a new message from Dr. Williams",
    time: "3 hours ago",
    read: true,
    type: "message",
  },
  {
    id: "5",
    title: "Payment received",
    description: "Payment of $150 received from patient Sarah Davis",
    time: "Yesterday",
    read: true,
    type: "billing",
  },
];

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-primary">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length > 0 ? (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className="p-0 focus:bg-transparent">
                  <NotificationItem notification={notification} onMarkAsRead={handleMarkAsRead} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">No notifications</div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm font-medium">
          <Link href="/notifications">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
