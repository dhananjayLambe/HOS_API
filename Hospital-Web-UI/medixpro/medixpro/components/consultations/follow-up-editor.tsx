"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConsultationStore } from "@/store/consultationStore";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REVISIT_OPTIONS = [
  { value: "3_days", label: "3 Days", interval: 3, unit: "days" as const },
  { value: "5_days", label: "5 Days", interval: 5, unit: "days" as const },
  { value: "7_days", label: "7 Days", interval: 7, unit: "days" as const },
  { value: "14_days", label: "14 Days", interval: 14, unit: "days" as const },
  { value: "1_month", label: "1 Month", interval: 1, unit: "months" as const },
  { value: "3_months", label: "3 Months", interval: 3, unit: "months" as const },
  { value: "custom", label: "Custom", interval: 0, unit: "days" as const },
] as const;

function getRevisitValue(interval: number, unit: string): string {
  if (interval === 0 && !unit) return "custom";
  const opt = REVISIT_OPTIONS.find(
    (o) => o.interval === interval && o.unit === unit
  );
  return opt?.value ?? "custom";
}

function addIntervalToDate(
  date: Date,
  interval: number,
  unit: "days" | "months"
): Date {
  const d = new Date(date);
  if (unit === "days") {
    d.setDate(d.getDate() + interval);
  } else {
    d.setMonth(d.getMonth() + interval);
  }
  return d;
}

function toISODateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function FollowUpEditor() {
  const {
    follow_up_interval,
    follow_up_unit,
    follow_up_date,
    follow_up_reason,
    follow_up_early_if_persist,
    setFollowUp,
    setSelectedDetail,
  } = useConsultationStore();

  const revisitValue = getRevisitValue(follow_up_interval, follow_up_unit);
  const isCustom = revisitValue === "custom";
  const nextVisitEditable = isCustom;

  const handleRevisitChange = (value: string) => {
    if (value === "custom") {
      setFollowUp({
        follow_up_interval: 0,
        follow_up_unit: "days",
        follow_up_date: follow_up_date || toISODateString(new Date()), // keep existing or today for editing
      });
      return;
    }
    const opt = REVISIT_OPTIONS.find((o) => o.value === value);
    if (!opt) return;
    const next = addIntervalToDate(new Date(), opt.interval, opt.unit);
    setFollowUp({
      follow_up_interval: opt.interval,
      follow_up_unit: opt.unit,
      follow_up_date: toISODateString(next),
    });
  };

  const displayDate = follow_up_date || "";

  return (
    <Card className="h-fit w-full max-w-full min-w-0 max-w-md shrink-0 self-start rounded-2xl border border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 pb-3">
        <h3 className="font-bold truncate pr-2">Follow-Up</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedDetail(null)}>
              Close panel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-4 pb-6">
        <div className="space-y-2">
          <Label htmlFor="follow-up-revisit">Revisit After</Label>
          <Select value={revisitValue} onValueChange={handleRevisitChange}>
            <SelectTrigger id="follow-up-revisit" className="rounded-md">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {REVISIT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="follow-up-date">Next Visit Date</Label>
          <Input
            id="follow-up-date"
            type="date"
            value={displayDate}
            onChange={(e) =>
              setFollowUp({ follow_up_date: e.target.value || "" })
            }
            readOnly={!nextVisitEditable}
            disabled={!nextVisitEditable}
            className="rounded-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="follow-up-reason">Reason (optional)</Label>
          <Input
            id="follow-up-reason"
            type="text"
            placeholder="e.g. Review BP, Show reports, Wound check"
            value={follow_up_reason}
            onChange={(e) =>
              setFollowUp({
                follow_up_reason: e.target.value.slice(0, 255),
              })
            }
            maxLength={255}
            className="rounded-md"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="follow-up-early"
            checked={follow_up_early_if_persist}
            onCheckedChange={(checked) =>
              setFollowUp({
                follow_up_early_if_persist: checked === true,
              })
            }
          />
          <Label
            htmlFor="follow-up-early"
            className="text-sm font-normal cursor-pointer"
          >
            If symptoms persist, revisit earlier
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
