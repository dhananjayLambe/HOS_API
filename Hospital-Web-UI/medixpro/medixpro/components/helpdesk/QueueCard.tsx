"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { QueueEntry, QueueStatus } from "@/lib/helpdeskQueueStore";
import { maskMobile, vitalsPreviewLine } from "@/lib/helpdeskQueueStore";
import { ArrowUp, MoreVertical, Stethoscope } from "lucide-react";

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

function statusBadge(status: QueueStatus): { label: string; className: string } {
  switch (status) {
    case "waiting":
      return {
        label: "Waiting",
        className:
          "border-muted-foreground/25 bg-muted text-muted-foreground dark:bg-muted/80",
      };
    case "vitals_done":
      return {
        label: "Pre-consult in progress",
        className:
          "border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-50",
      };
    case "in_consultation":
      return {
        label: "In consultation",
        className:
          "border-sky-300/80 bg-sky-50 text-sky-950 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-50",
      };
    case "completed":
      return {
        label: "Completed",
        className:
          "border-emerald-300/80 bg-emerald-50 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-50",
      };
  }
}

function ageGenderLine(entry: QueueEntry): string {
  const age = entry.age != null ? `${entry.age}y` : "—";
  const g = entry.gender?.trim() || "—";
  return `${age} · ${g}`;
}

interface QueueCardProps {
  entry: QueueEntry;
  position: number;
  onVitals: () => void;
  onUrgent: () => void;
  onRemove: () => void;
  onOpen: () => void;
  className?: string;
}

export function QueueCard({
  entry,
  position,
  onVitals,
  onUrgent,
  onRemove,
  onOpen,
  className,
}: QueueCardProps) {
  const badge = statusBadge(entry.status);
  const preview = vitalsPreviewLine(entry.vitals);
  const token = entry.token?.trim() || `#${position}`;
  const canFlow = entry.status === "waiting" || entry.status === "vitals_done";

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
              <p className="truncate text-base font-semibold leading-tight text-foreground">{entry.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{ageGenderLine(entry)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">Token {token}</p>
            </div>

            <div className="flex shrink-0 items-start gap-1">
              {canFlow ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shrink-0 rounded-lg"
                    title="Vitals"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVitals();
                    }}
                  >
                    <Stethoscope className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 shrink-0 rounded-lg"
                    title="More"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {canFlow ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onUrgent();
                      }}
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Urgent
                    </DropdownMenuItem>
                  ) : null}
                  {entry.status !== "completed" ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                      }}
                    >
                      Remove from queue
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border font-medium tabular-nums">
              {ordinalInQueue(position)}
            </Badge>
            <Badge variant="outline" className={cn("border font-medium", badge.className)}>
              {badge.label}
            </Badge>
          </div>

          {preview ? (
            <p className="text-xs text-muted-foreground tabular-nums line-clamp-2">{preview}</p>
          ) : (
            <p className="text-xs text-muted-foreground">No vitals yet</p>
          )}

          <p className="text-xs text-muted-foreground tabular-nums">{maskMobile(entry.mobile)}</p>
        </div>
      </div>
    </div>
  );
}
