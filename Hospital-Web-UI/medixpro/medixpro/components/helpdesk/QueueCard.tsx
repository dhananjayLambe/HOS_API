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
import { ArrowBigDown, ArrowBigUp, ArrowDown, ArrowUp, MoreVertical, Stethoscope } from "lucide-react";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  compact?: boolean;
  onVitals: () => void;
  onUrgent: () => void;
  onRemove: () => void;
  onMove: (direction: "top" | "up" | "down" | "bottom") => void;
  canMove: boolean;
  disableMove: boolean;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  className?: string;
}

export function QueueCard({
  entry,
  position,
  compact = false,
  onVitals,
  onUrgent,
  onRemove,
  onMove,
  canMove,
  disableMove,
  isFirst,
  isLast,
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
        "w-full cursor-pointer rounded-2xl border border-border/80 bg-card text-left shadow-sm transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "p-2.5" : "p-4",
        className
      )}
    >
      <div className={cn("flex", compact ? "gap-2" : "gap-3")}>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
            compact ? "h-8 w-8 text-[11px]" : "h-11 w-11 text-sm"
          )}
          aria-hidden
        >
          {initialsFromName(entry.name)}
        </div>

        <div className={cn("min-w-0 flex-1", compact ? "space-y-1" : "space-y-2")}>
          <div className={cn("flex items-start justify-between", compact ? "gap-1.5" : "gap-2")}>
            <div className="min-w-0">
              <p className={cn("truncate font-semibold leading-tight text-foreground", compact ? "text-sm" : "text-base")}>
                {entry.name}
              </p>
              <p className={cn("text-muted-foreground", compact ? "mt-0 text-xs" : "mt-0.5 text-sm")}>
                {ageGenderLine(entry)}
              </p>
              <p className={cn("text-muted-foreground tabular-nums", compact ? "text-[11px]" : "text-xs")}>Token {token}</p>
              {!compact ? (
                <p className="text-xs font-medium text-muted-foreground tabular-nums">Queue #{position}</p>
              ) : null}
            </div>

            <div className={cn("flex shrink-0 items-start", compact ? "gap-0.5" : "gap-1")}>
              {canFlow ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className={cn("shrink-0 rounded-lg", compact ? "h-8 w-8" : "h-9 w-9")}
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
                    className={cn("shrink-0 rounded-lg", compact ? "h-8 w-8" : "h-9 w-9")}
                    title="More"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove("top");
                    }}
                    disabled={!canMove || disableMove || isFirst}
                  >
                    <ArrowBigUp className="mr-2 h-4 w-4" />
                    Move to top
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove("up");
                    }}
                    disabled={!canMove || disableMove || isFirst}
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove("down");
                    }}
                    disabled={!canMove || disableMove || isLast}
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove("bottom");
                    }}
                    disabled={!canMove || disableMove || isLast}
                  >
                    <ArrowBigDown className="mr-2 h-4 w-4" />
                    Move to bottom
                  </DropdownMenuItem>
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
            <Badge variant="outline" className={cn("border font-medium", badge.className)}>
              {badge.label}
            </Badge>
            {compact ? (
              <Badge variant="outline" className="border font-medium tabular-nums">
                #{position}
              </Badge>
            ) : null}
          </div>

          {preview ? (
            <p className={cn("text-muted-foreground tabular-nums", compact ? "text-[11px] line-clamp-1" : "text-xs line-clamp-2")}>
              {preview}
            </p>
          ) : (
            <p className={cn("text-muted-foreground", compact ? "text-[11px]" : "text-xs")}>No vitals yet</p>
          )}

          {!compact ? <p className="text-xs text-muted-foreground tabular-nums">{maskMobile(entry.mobile)}</p> : null}
        </div>
      </div>
    </div>
  );
}
