"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "appointment" | "message" | "system" | "prescription" | "billing";
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const getTypeIcon = (type: Notification["type"]) => {
    switch (type) {
      case "appointment":
        return "🗓️";
      case "message":
        return "💬";
      case "system":
        return "🔔";
      case "prescription":
        return "💊";
      case "billing":
        return "💰";
      default:
        return "🔔";
    }
  };

  return (
    <div className={cn("flex items-start gap-2 p-3 text-sm transition-colors hover:bg-muted/50 rounded-md", notification.read ? "opacity-80" : "bg-muted/30")}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <span role="img" aria-label={notification.type}>
          {getTypeIcon(notification.type)}
        </span>
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn("font-medium", !notification.read && "font-semibold")}>{notification.title}</p>
          <p className="text-xs text-muted-foreground">{notification.time}</p>
        </div>
        <p className="text-xs text-muted-foreground">{notification.description}</p>
      </div>
      {!notification.read && (
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={() => onMarkAsRead(notification.id)}>
          <Check className="h-3 w-3" />
          <span className="sr-only">Mark as read</span>
        </Button>
      )}
    </div>
  );
}
