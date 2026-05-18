"use client";

import { cn } from "@/lib/utils";

export function PipelineEmptyState({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn("flex flex-1 items-center justify-center px-2 py-1.5 text-center text-[11px] leading-snug text-[#9CA3AF]", className)}>
      {message}
    </p>
  );
}
