"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QueueEntry, QueueStatus } from "@/lib/helpdeskQueueStore";
import { maskMobile } from "@/lib/helpdeskQueueStore";
import { ArrowUp, Phone } from "lucide-react";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ordinalInQueue(n: number) {
  const j = n % 10;
  const k = n % 100;
  const suf = j === 1 && k !== 11 ? "st" : j === 2 && k !== 12 ? "nd" : j === 3 && k !== 13 ? "rd" : "th";
  return `${n}${suf} in queue`;
}

function positionBadgeClass(n: number) {
  if (n === 1) {
    return "border-violet-200/80 bg-violet-100 text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-100";
  }
  if (n === 2) {
    return "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100";
  }
  if (n <= 4) {
    return "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100";
  }
  return "border-rose-200/90 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100";
}

function visitBadge(status: QueueStatus) {
  switch (status) {
    case "waiting":
      return {
        label: "Check-up",
        className:
          "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100",
      };
    case "pre_consult":
      return {
        label: "Pre-consult",
        className:
          "border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100",
      };
    case "with_doctor":
      return {
        label: "Consultation",
        className:
          "border-violet-200/80 bg-violet-100 text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-100",
      };
  }
}

interface QueueCardProps {
  entry: QueueEntry;
  position: number;
  onCheckIn: () => void;
  onOpenVitals: () => void;
  onUrgent: () => void;
  onOpen: () => void;
  className?: string;
}

export function QueueCard({ entry, position, onCheckIn, onOpenVitals, onUrgent, onOpen, className }: QueueCardProps) {
  const visit = visitBadge(entry.status);

  const primary =
    entry.status === "waiting" ? (
      <Button
        type="button"
        size="sm"
        className="h-9 min-w-[5.5rem] rounded-lg"
        onClick={(e) => {
          e.stopPropagation();
          onCheckIn();
        }}
      >
        Check-In
      </Button>
    ) : entry.status === "pre_consult" ? (
      <Button
        type="button"
        size="sm"
        className="h-9 min-w-[5.5rem] rounded-lg"
        variant="default"
        onClick={(e) => {
          e.stopPropagation();
          onOpenVitals();
        }}
      >
        Vitals
      </Button>
    ) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "w-full cursor-pointer rounded-2xl border border-border/80 bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <div className="flex gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
          aria-hidden
        >
          {initialsFromName(entry.name)}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold leading-tight text-foreground">{entry.name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="tabular-nums">{maskMobile(entry.mobile)}</span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              {primary}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 min-w-[4.5rem] rounded-lg border-border bg-background"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen();
                }}
              >
                View
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Badge variant="outline" className={cn("border font-medium", positionBadgeClass(position))}>
              {ordinalInQueue(position)}
            </Badge>
            <Badge variant="outline" className={cn("border font-medium", visit.className)}>
              {visit.label}
            </Badge>
          </div>

          {entry.status !== "with_doctor" && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 gap-1 rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onUrgent();
                }}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
                Urgent
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
