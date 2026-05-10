"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UrgencyLevel } from "@/lib/labs/constants/urgency";
import { URGENCY_LABELS } from "@/lib/labs/constants/urgency";

export function LabUrgencyBadge({ level, className }: { level: UrgencyLevel; className?: string }) {
  const variant =
    level === "STAT" ? "destructive" : level === "URGENT" ? "warning" : ("secondary" as const);
  return (
    <Badge variant={variant} className={cn("shrink-0 font-semibold", className)}>
      {URGENCY_LABELS[level]}
    </Badge>
  );
}
