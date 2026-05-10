"use client";

import { labLavenderBorder, labShadowSoft } from "@/components/labs/labDesignTokens";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LabFilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 rounded-2xl border bg-[#FFFFFF] p-4 shadow-sm sm:gap-4 sm:p-5",
        labLavenderBorder,
        labShadowSoft,
        className
      )}
    >
      {children}
    </div>
  );
}
