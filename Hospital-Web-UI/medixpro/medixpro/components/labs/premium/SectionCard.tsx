"use client";

import { labSectionCardOuter, labSectionTitle } from "@/components/labs/labDesignTokens";
import { labTw } from "@/styles/lab-design-system";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Tighter header padding for dense operational tables. */
  compact?: boolean;
  /** Sticky operational header — queue / high-attention panels. */
  operationalHeader?: boolean;
};

/** Premium operational module — 28px shell, optional subtitle, table flush below divider. */
export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className,
  compact,
  operationalHeader,
}: SectionCardProps) {
  return (
    <section className={cn(labSectionCardOuter, "flex flex-col", className)}>
      <div
        className={cn(
          "flex flex-row flex-wrap items-center justify-between",
          compact ? "gap-2 px-3 pb-1.5 pt-2.5" : "gap-4 px-6 pt-6",
          compact && !operationalHeader ? (subtitle ? "mb-2" : "mb-1") : !compact && subtitle ? "mb-6" : "mb-0",
          operationalHeader &&
            "sticky top-0 z-10 border-b-2 border-[#E5E3FF] bg-white/95 shadow-[0_1px_0_rgba(124,92,252,0.08)] backdrop-blur-sm",
        )}
      >
        <div className="min-w-0 space-y-1">
          <h2 className={cn(compact ? "text-base font-semibold tracking-tight text-[#111827]" : labSectionTitle)}>
            {title}
          </h2>
          {subtitle ? <p className={cn("max-w-2xl text-sm leading-relaxed", labTw.textSecondary)}>{subtitle}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {!operationalHeader ? <div className="h-px w-full bg-[#ECEBFF]" aria-hidden /> : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col p-0">{children}</div>
    </section>
  );
}
