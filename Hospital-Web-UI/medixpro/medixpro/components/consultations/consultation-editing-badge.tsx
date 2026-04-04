"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConsultationEditingBadge({
  className,
  onDarkChip,
}: {
  className?: string;
  /** Selected chip uses indigo background — badge inverts for contrast. */
  onDarkChip?: boolean;
}) {
  return (
    <span
      className={cn(
        "editing-badge",
        onDarkChip &&
          "border border-white/35 bg-white/20 !text-white dark:bg-white/20",
        className
      )}
      aria-hidden
    >
      <Pencil className="h-2.5 w-2.5 shrink-0" strokeWidth={2.5} />
      Editing
    </span>
  );
}
