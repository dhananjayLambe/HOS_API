"use client";

import { labSectionCardOuter, labSectionTitle } from "@/components/labs/labDesignTokens";
import { labTw } from "@/styles/lab-design-system";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Premium operational module — 28px shell, optional subtitle, table flush below divider. */
export function SectionCard({ title, subtitle, action, children, className }: SectionCardProps) {
  return (
    <section className={cn(labSectionCardOuter, className)}>
      <div
        className={cn(
          "flex flex-row flex-wrap items-start justify-between gap-4 px-6 pt-6",
          subtitle ? "mb-6" : "mb-4"
        )}
      >
        <div className="min-w-0 space-y-1">
          <h2 className={labSectionTitle}>{title}</h2>
          {subtitle ? <p className={cn("max-w-2xl text-sm leading-relaxed", labTw.textSecondary)}>{subtitle}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      <div className="h-px w-full bg-[#ECEBFF]" aria-hidden />
      <div className="p-0">{children}</div>
    </section>
  );
}
