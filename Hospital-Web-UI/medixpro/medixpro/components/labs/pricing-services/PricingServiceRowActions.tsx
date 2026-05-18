"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Navigational affordance — row click opens drawer. No CRUD in Phase 1. */
export function PricingServiceRowActions({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[#C4C0D8] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[#7C5CFC]",
        className,
      )}
      aria-hidden
    >
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}
