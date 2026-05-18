"use client";

import { cn } from "@/lib/utils";

export function PricingServicesSummaryCardsSkeleton() {
  return (
    <section className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-9 animate-pulse rounded-full border border-[#ECEBFF] bg-[#F4F1FF]",
            i === 0 ? "w-36" : i === 4 ? "w-24" : "w-32",
          )}
        />
      ))}
    </section>
  );
}
