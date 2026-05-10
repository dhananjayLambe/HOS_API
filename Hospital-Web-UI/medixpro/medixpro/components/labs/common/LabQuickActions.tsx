"use client";

import { labLavenderBorder, labMotion, labShadowSoft } from "@/components/labs/labDesignTokens";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MapPin, MessageCircle, MoreHorizontal, Phone, Upload, UserPlus, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export type QuickActionKey =
  | "call"
  | "whatsapp"
  | "map"
  | "upload"
  | "assign"
  | "complete"
  | "more";

const labels: Record<QuickActionKey, string> = {
  call: "Call patient",
  whatsapp: "WhatsApp",
  map: "Open maps",
  upload: "Upload report",
  assign: "Assign",
  complete: "Mark complete",
  more: "More",
};

const icons: Record<QuickActionKey, typeof Phone> = {
  call: Phone,
  whatsapp: MessageCircle,
  map: MapPin,
  upload: Upload,
  assign: UserPlus,
  complete: CheckCircle,
  more: MoreHorizontal,
};

function mock(label: string) {
  toast.message(label, { description: "Phase 1 UI — action not wired to API yet." });
}

const quickBtnClass =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-[#6B7280] " +
  labLavenderBorder +
  " " +
  labShadowSoft +
  " " +
  labMotion +
  " hover:border-[color:rgba(124,92,252,0.25)] hover:bg-[#F4F1FF] hover:text-[#7C5CFC]";

export function LabQuickActions({
  keys,
  size = "default",
  className,
}: {
  keys: QuickActionKey[];
  size?: "default" | "sm";
  className?: string;
}) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-4 w-4 sm:h-[18px] sm:w-[18px]";
  const btnSize = "icon" as const;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 sm:gap-2", className)}>
      {keys.map((k) => {
        if (k === "more") {
          return (
            <DropdownMenu key={k}>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size={btnSize} className={quickBtnClass} aria-label={labels[k]}>
                  <MoreHorizontal className={iconClass} strokeWidth={2} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => mock("Reschedule")}>Reschedule</DropdownMenuItem>
                <DropdownMenuItem onClick={() => mock("Cancel")}>Cancel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => mock("View logs")}>View logs</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
        const Icon = icons[k];
        return (
          <Button
            key={k}
            type="button"
            variant="outline"
            size={btnSize}
            className={quickBtnClass}
            aria-label={labels[k]}
            onClick={() => mock(labels[k])}
          >
            <Icon className={iconClass} strokeWidth={2} />
          </Button>
        );
      })}
    </div>
  );
}
