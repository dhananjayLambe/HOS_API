"use client";

import { type ReactNode, useState } from "react";
import { AlertTriangle, ChevronDown, Minus, Plus } from "lucide-react";
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
}

export function ConsultationSectionCard({
  title,
  icon,
  children,
  defaultOpen = false,
  headerRight,
  className,
  incompleteCount = 0,
}: ConsultationSectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
          className
        )}
      >
        <CardHeader className="sticky top-0 z-10 flex flex-row items-center justify-between space-y-0 rounded-t-2xl bg-card p-0 pb-3">
          <button
            type="button"
            className="flex flex-1 items-center gap-2 text-left outline-none hover:opacity-80 cursor-pointer min-h-[44px] -mx-1 px-1 rounded-lg touch-manipulation active:opacity-90"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          >
            <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
            <span className="font-semibold">{title}</span>
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
              onClick={() => setOpen(!open)}
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
          <CardContent className="p-0 pt-2 pb-1">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
