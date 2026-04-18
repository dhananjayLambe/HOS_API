"use client";

import {
  type ReactNode,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
} from "react";
import { AlertCircle, AlertTriangle, ChevronDown, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface ConsultationSectionCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  headerRight?: ReactNode;
  className?: string;
  /** When ≥1, show "⚠️ N incomplete" in header. */
  incompleteCount?: number;
  /** Fires when the collapsible opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** End-consultation validation: inline message + card highlight. */
  validationError?: string;
  /** Show required (*) next to title for current workflow. */
  titleRequired?: boolean;
}

export type ConsultationSectionCardHandle = {
  expand: () => void;
};

export const ConsultationSectionCard = forwardRef<
  ConsultationSectionCardHandle,
  ConsultationSectionCardProps
>(function ConsultationSectionCard(
  {
    title,
    icon,
    children,
    defaultOpen = false,
    headerRight,
    className,
    incompleteCount = 0,
    onOpenChange,
    validationError,
    titleRequired = false,
  },
  ref
) {
  const [open, setOpen] = useState(defaultOpen);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange]
  );

  useImperativeHandle(ref, () => ({ expand: () => handleOpenChange(true) }), [handleOpenChange]);

  return (
    <Collapsible open={open} onOpenChange={handleOpenChange}>
      <Card
        className={cn(
          "mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
          validationError &&
            "border-amber-500/50 bg-amber-500/[0.04] dark:bg-amber-500/10",
          className
        )}
      >
        <CardHeader className="sticky top-0 z-10 flex flex-row items-center justify-between space-y-0 rounded-t-2xl bg-card p-0 pb-3">
          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left outline-none hover:opacity-80 cursor-pointer min-h-[44px] -mx-1 px-1 rounded-lg touch-manipulation active:opacity-90"
            onClick={() => handleOpenChange(true)}
            aria-expanded={open}
            aria-label={`Open ${title}`}
          >
            <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
            <span className="font-semibold">
              {title}
              {titleRequired && (
                <span className="text-amber-600 dark:text-amber-400 ml-0.5" aria-hidden>
                  *
                </span>
              )}
            </span>
            {incompleteCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-normal">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {incompleteCount} incomplete
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </button>
          <div className="flex items-center gap-1">
            {headerRight}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-lg touch-manipulation sm:h-8 sm:w-8"
              aria-label={open ? "Collapse section" : "Expand section"}
              onClick={() => handleOpenChange(!open)}
            >
              {open ? (
                <Minus className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-0 pt-2 pb-1">
            {validationError ? (
              <div
                className="mb-3 rounded-lg border border-amber-300/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden />
                <p className="text-xs text-amber-950 dark:text-amber-100 leading-snug">
                  {validationError}
                </p>
              </div>
            ) : null}
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
});
