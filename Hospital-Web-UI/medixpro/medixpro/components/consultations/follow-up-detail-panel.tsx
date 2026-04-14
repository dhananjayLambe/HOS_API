"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { CalendarDays, Lock, X } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useConsultationStore } from "@/store/consultationStore";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { cn } from "@/lib/utils";

const TOAST_DEDUPE_MS = 2000;
const NOTES_DEBOUNCE_MS = 500;

const QUICK_CHIP_CLASS =
  "rounded-full border border-muted-foreground/40 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-muted-foreground/60 hover:bg-muted/50 hover:text-foreground";

/** Calendar grid icon — reads clearly as “pick a date” for users. */
function CalendarMark({
  className,
  size = "md",
  ...props
}: ComponentProps<typeof CalendarDays> & {
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <CalendarDays
      className={cn("shrink-0", dim, className)}
      strokeWidth={size === "lg" ? 2 : 2.25}
      aria-hidden
      {...props}
    />
  );
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysFromToday(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

function parseISODateLocal(s: string): Date | undefined {
  if (!s?.trim()) return undefined;
  const parts = s.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const day = parts[2];
  if (!y || !m || !day) return undefined;
  const d = new Date(y, m - 1, day);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatDisplayDate(iso: string): string {
  const d = parseISODateLocal(iso);
  if (!d) return "";
  try {
    return format(d, "d MMM yyyy");
  } catch {
    return iso;
  }
}

export function FollowUpDetailPanel() {
  const toast = useToastNotification();
  const toastDedupeRef = useRef(0);
  const panelFocusRef = useRef<HTMLDivElement>(null);

  const {
    follow_up_date,
    follow_up_reason,
    consultationFinalized,
    setFollowUp,
    setSelectedDetail,
  } = useConsultationStore(
    useShallow((s) => ({
      follow_up_date: s.follow_up_date,
      follow_up_reason: s.follow_up_reason,
      consultationFinalized: s.consultationFinalized,
      setFollowUp: s.setFollowUp,
      setSelectedDetail: s.setSelectedDetail,
    }))
  );

  const locked = consultationFinalized;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesLocal, setNotesLocal] = useState(follow_up_reason);
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotesLocal(follow_up_reason);
  }, [follow_up_reason]);

  useEffect(() => {
    return () => {
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const t = window.requestAnimationFrame(() => {
      panelFocusRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(t);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedDetail(null);
  }, [setSelectedDetail]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const emitFollowUpToast = useCallback(() => {
    const now = Date.now();
    if (now - toastDedupeRef.current < TOAST_DEDUPE_MS) return;
    toastDedupeRef.current = now;
    toast.success("Follow-up added");
  }, [toast]);

  const flushNotesToStore = useCallback(
    (value: string) => {
      setFollowUp({ follow_up_reason: value.slice(0, 255) });
    },
    [setFollowUp]
  );

  const onNotesChange = useCallback(
    (value: string) => {
      setNotesLocal(value);
      if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
      notesDebounceRef.current = setTimeout(() => {
        notesDebounceRef.current = null;
        flushNotesToStore(value);
      }, NOTES_DEBOUNCE_MS);
    },
    [flushNotesToStore]
  );

  const applyDate = useCallback(
    (iso: string) => {
      if (!iso) return;
      setFollowUp({
        follow_up_date: iso,
        follow_up_interval: 0,
        follow_up_unit: "days",
      });
      setPickerOpen(false);
      emitFollowUpToast();
    },
    [setFollowUp, emitFollowUpToast]
  );

  const onQuickDays = useCallback(
    (days: number) => {
      if (locked) return;
      const iso = addDaysFromToday(days);
      setFollowUp({
        follow_up_date: iso,
        follow_up_interval: days,
        follow_up_unit: "days",
      });
      emitFollowUpToast();
    },
    [locked, setFollowUp, emitFollowUpToast]
  );

  const onCalendarSelect = useCallback(
    (date: Date | undefined) => {
      if (locked || !date) return;
      applyDate(toLocalISODate(date));
    },
    [locked, applyDate]
  );

  const clearFollowUpDate = useCallback(() => {
    if (locked) return;
    setNotesLocal("");
    setFollowUp({
      follow_up_date: "",
      follow_up_interval: 0,
      follow_up_unit: "days",
      follow_up_reason: "",
      follow_up_early_if_persist: false,
    });
  }, [locked, setFollowUp]);

  const selectedDate = parseISODateLocal(follow_up_date);
  const hasDate = Boolean(follow_up_date?.trim());

  return (
    <Card
      ref={panelFocusRef}
      tabIndex={-1}
      className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md flex flex-col min-h-0"
    >
      <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 space-y-0 border-b border-border/60 py-3 pb-2.5">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base leading-tight">Follow-Up</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {hasDate ? `Scheduled: ${formatDisplayDate(follow_up_date)}` : "No date set yet"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full"
          aria-label="Close follow-up panel"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6 pt-4">
        {locked && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            <Lock className="h-4 w-4 shrink-0" />
            Consultation finalized
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary dark:bg-primary/15 dark:border-primary/25">
              <CalendarMark size="sm" className="text-primary" />
            </span>
            Date
          </Label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={locked}
                title="Open calendar"
                className={cn(
                  "h-10 w-full justify-start gap-3 border-border bg-background text-left text-sm font-normal shadow-none transition-colors",
                  "hover:bg-muted/50 hover:text-foreground",
                  !hasDate && "text-muted-foreground"
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-sm dark:bg-primary/15 dark:border-primary/30"
                  aria-hidden
                >
                  <CalendarMark size="lg" />
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {hasDate ? formatDisplayDate(follow_up_date) : "Select date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden rounded-lg border border-border p-0 shadow-md"
              align="start"
              sideOffset={6}
            >
              <div className="flex items-center gap-2.5 border-b border-border/80 bg-muted/30 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary dark:bg-primary/15">
                  <CalendarMark size="lg" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  Select follow-up date
                </span>
              </div>
              <div className="p-1.5">
                <Calendar
                  mode="single"
                  defaultMonth={selectedDate ?? new Date()}
                  selected={selectedDate}
                  onSelect={onCalendarSelect}
                  initialFocus
                  disabled={locked}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick options
          </p>
          <div className="flex flex-wrap gap-2">
            {([3, 5, 7] as const).map((d) => (
              <button
                key={d}
                type="button"
                disabled={locked}
                onClick={() => onQuickDays(d)}
                className={QUICK_CHIP_CLASS}
              >
                +{d} days
              </button>
            ))}
          </div>
        </div>

        {hasDate && (
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">Follow-up on </span>
            <span className="font-medium">{formatDisplayDate(follow_up_date)}</span>
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="follow-up-notes-panel" className="text-xs">
            Notes (optional)
          </Label>
          <Textarea
            id="follow-up-notes-panel"
            disabled={locked}
            placeholder="Add note (optional)"
            value={notesLocal}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={() => {
              if (notesDebounceRef.current) {
                clearTimeout(notesDebounceRef.current);
                notesDebounceRef.current = null;
              }
              flushNotesToStore(notesLocal);
            }}
            className="min-h-[72px] w-full resize-y rounded-md border border-input text-sm"
          />
        </div>

        {hasDate && (
          <button
            type="button"
            disabled={locked}
            onClick={clearFollowUpDate}
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Remove follow-up
          </button>
        )}
      </CardContent>
    </Card>
  );
}
