"use client";

import { memo, useMemo } from "react";
import { Download, Eye, MoreVertical, Printer, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { PrescriptionListItem } from "@/lib/api/prescriptions";

export interface PrescriptionRowAction {
  type: "view" | "print" | "download" | "cancel";
  row: PrescriptionListItem;
}

interface PrescriptionsListProps {
  items: PrescriptionListItem[];
  onRowOpen: (row: PrescriptionListItem) => void;
  onAction: (action: PrescriptionRowAction) => void;
  busyConsultationId?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return { date: "-", time: "" };
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return { date: value, time: "" };
    return {
      date: format(parsed, "dd MMM yyyy"),
      time: format(parsed, "hh:mm a"),
    };
  } catch {
    return { date: value, time: "" };
  }
};

const buildAgeGender = (row: PrescriptionListItem) => {
  const age = (row.patient.age_display || "").trim();
  const gender = (row.patient.gender || "").trim();
  if (age && gender) return `${age} / ${gender}`;
  return age || gender || "-";
};

const buildMedicineSummary = (row: PrescriptionListItem) => {
  const preview = row.medicines_preview || [];
  const count = row.medicines_count ?? preview.length;
  if (count === 0) return "No medicines";
  if (preview.length === 0) return `${count} ${count === 1 ? "Medicine" : "Medicines"}`;
  const first = preview[0];
  const remaining = count - 1;
  if (remaining <= 0) return first;
  return `${first} +${remaining} more`;
};

const compactPnr = (pnr: string) => {
  if (pnr.length <= 16) return pnr;
  return `${pnr.slice(0, 9)}...${pnr.slice(-3)}`;
};

function StatusBadge({ isCancelled }: { isCancelled: boolean }) {
  if (isCancelled) {
    return (
      <Badge
        variant="destructive"
        className="bg-red-600 text-white tracking-wide"
        aria-label="Cancelled prescription"
      >
        CANCELLED
      </Badge>
    );
  }
  return (
    <Badge
      variant="success"
      className="bg-green-600 text-white tracking-wide"
      aria-label="Active prescription"
    >
      ACTIVE
    </Badge>
  );
}

interface RowProps {
  row: PrescriptionListItem;
  onRowOpen: (row: PrescriptionListItem) => void;
  onAction: (action: PrescriptionRowAction) => void;
  busy: boolean;
}

const DesktopRow = memo(function DesktopRow({ row, onRowOpen, onAction, busy }: RowProps) {
  const dateParts = formatDate(row.consultation_date);
  const ageGender = buildAgeGender(row);
  const medicines = buildMedicineSummary(row);
  const diagnosis = row.diagnosis_summary || "-";

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowOpen(row);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowOpen(row)}
      onKeyDown={handleRowKeyDown}
      className={cn(
        "group grid grid-cols-12 items-center gap-3 border-b border-border/60 px-4 py-2 text-sm transition-colors cursor-pointer",
        "hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/45",
        row.is_cancelled && "bg-red-50/70 text-foreground/90 hover:bg-red-50"
      )}
    >
      <div className="col-span-3 min-w-0">
        <p className="truncate font-semibold text-foreground">
          {row.patient.full_name || "Unknown patient"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{ageGender}</p>
      </div>

      <div className="col-span-2 min-w-0">
        <p className="truncate font-mono text-[11px] text-foreground/90" title={row.pnr}>
          {compactPnr(row.pnr)}
        </p>
      </div>

      <div className="col-span-2 min-w-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="truncate" aria-label={diagnosis}>
                {diagnosis}
              </p>
            </TooltipTrigger>
            {row.diagnosis_summary ? (
              <TooltipContent side="top" align="start" className="max-w-xs">
                {row.diagnosis_summary}
              </TooltipContent>
            ) : null}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="col-span-2 min-w-0">
        <p className="truncate" title={medicines}>
          {medicines}
        </p>
      </div>

      <div className="col-span-1 min-w-0">
        <p className="truncate font-medium">{dateParts.date}</p>
        {dateParts.time ? (
          <p className="truncate text-xs text-muted-foreground">{dateParts.time}</p>
        ) : null}
      </div>

      <div className="col-span-1">
        <StatusBadge isCancelled={row.is_cancelled} />
      </div>

      <div
        className="col-span-1 flex items-center justify-end gap-1"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md bg-muted/45 text-foreground/80 hover:bg-muted hover:text-foreground"
          aria-label="View prescription"
          onClick={() => onAction({ type: "view", row })}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md bg-muted/45 text-foreground/80 hover:bg-muted hover:text-foreground"
          aria-label="Print prescription"
          disabled={row.is_cancelled}
          onClick={() => onAction({ type: "print", row })}
        >
          <Printer className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-md bg-muted/45 text-foreground/80 hover:bg-muted hover:text-foreground"
          aria-label="Download prescription PDF"
          disabled={row.is_cancelled || busy}
          onClick={() => onAction({ type: "download", row })}
        >
          <Download className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-muted/45 text-foreground/80 hover:bg-muted hover:text-foreground"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              disabled={row.is_cancelled}
              onClick={() => onAction({ type: "cancel", row })}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Prescription
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

const MobileCard = memo(function MobileCard({ row, onRowOpen, onAction, busy }: RowProps) {
  const dateParts = formatDate(row.consultation_date);
  const ageGender = buildAgeGender(row);
  const medicines = buildMedicineSummary(row);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRowOpen(row)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onRowOpen(row);
        }
      }}
      className={cn(
        "rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        row.is_cancelled && "bg-red-50/65"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.patient.full_name || "Unknown patient"}</p>
          <p className="truncate text-xs text-muted-foreground">{ageGender}</p>
        </div>
        <StatusBadge isCancelled={row.is_cancelled} />
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="font-mono text-xs text-muted-foreground">{row.pnr}</p>
        <p className="line-clamp-2 text-foreground">{row.diagnosis_summary || "-"}</p>
        <p className="text-muted-foreground">{medicines}</p>
        <p className="text-xs text-muted-foreground">
          {dateParts.date}
          {dateParts.time ? ` · ${dateParts.time}` : ""}
        </p>
      </div>

      <div
        className="mt-4 flex items-center gap-2"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          onClick={() => onAction({ type: "view", row })}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          View
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          disabled={row.is_cancelled}
          onClick={() => onAction({ type: "print", row })}
        >
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          disabled={row.is_cancelled || busy}
          onClick={() => onAction({ type: "download", row })}
        >
          <Download className="mr-1.5 h-4 w-4" />
          PDF
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="min-h-11 min-w-11"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-700"
              disabled={row.is_cancelled}
              onClick={() => onAction({ type: "cancel", row })}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Prescription
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export function PrescriptionsList({
  items,
  onRowOpen,
  onAction,
  busyConsultationId,
}: PrescriptionsListProps) {
  const memoizedItems = useMemo(() => items, [items]);

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="hidden md:block">
        <div
          className="grid grid-cols-12 gap-3 border-b border-border/70 bg-muted/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/80"
          role="row"
        >
          <div className="col-span-3">Patient</div>
          <div className="col-span-2">PNR</div>
          <div className="col-span-2">Diagnosis</div>
          <div className="col-span-2">Medicines</div>
          <div className="col-span-1">Date</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        <div role="rowgroup">
          {memoizedItems.map((row) => (
            <DesktopRow
              key={row.consultation_id}
              row={row}
              onRowOpen={onRowOpen}
              onAction={onAction}
              busy={busyConsultationId === row.consultation_id}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {memoizedItems.map((row) => (
          <MobileCard
            key={row.consultation_id}
            row={row}
            onRowOpen={onRowOpen}
            onAction={onAction}
            busy={busyConsultationId === row.consultation_id}
          />
        ))}
      </div>
    </div>
  );
}
