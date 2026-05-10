"use client";

import { labCardSurface, labPageTitle, labTextMuted } from "@/components/labs/labDesignTokens";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LabPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className={cn(
        labCardSurface,
        "px-5 py-5 sm:flex sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-8 sm:py-7"
      )}
    >
      <div className="min-w-0 space-y-2">
        <h1 className={labPageTitle}>{title}</h1>
        {description ? (
          <p className={cn("max-w-2xl text-sm leading-relaxed", labTextMuted)}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">{actions}</div> : null}
    </div>
  );
}
