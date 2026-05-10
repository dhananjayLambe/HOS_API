"use client";

import { labShadowSoft } from "@/components/labs/labDesignTokens";
import { ActionButton } from "@/components/labs/premium/ActionButton";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LabEmptyStateProps = {
  title: string;
  description?: string;
  /** Optional illustration (e.g. Lucide composition). Defaults to a simple inbox mark. */
  illustration?: ReactNode;
  /** Primary CTA — rendered with {@link ActionButton} styling when this is a string label. */
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

export function LabEmptyState({ title, description, illustration, action, actionLabel, onAction }: LabEmptyStateProps) {
  const defaultIllustration = (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4F1FF] text-[#7C5CFC] ring-1 ring-[color:rgba(124,92,252,0.1)]">
      <Inbox className="h-5 w-5" aria-hidden strokeWidth={2} />
    </div>
  );

  const resolvedAction =
    action ??
    (actionLabel && onAction ? (
      <ActionButton type="button" variant="secondary" className="h-9 px-4 text-xs" onClick={onAction}>
        {actionLabel}
      </ActionButton>
    ) : null);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[color:rgba(124,92,252,0.15)] bg-white px-6 py-12 text-center",
        labShadowSoft
      )}
    >
      <div className="mb-4">{illustration ?? defaultIllustration}</div>
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#6B7280]">{description}</p> : null}
      {resolvedAction ? <div className="mt-5 flex justify-center">{resolvedAction}</div> : null}
    </div>
  );
}
