"use client";

import { useMemo, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CLINICAL_STATUS_LABELS,
  EMPTY_ADVANCED_FILTERS,
  type AdvancedWorkspaceFilters,
  type ClinicalReportStatus,
  type WorkspaceReport,
} from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { countActiveAdvancedFilters } from "@/lib/doctor/diagnostic-reports-workspace/filter-workspace-reports";

type WorkspaceAdvancedFiltersProps = {
  value: AdvancedWorkspaceFilters;
  onChange: (next: AdvancedWorkspaceFilters) => void;
  reportsForOptions: WorkspaceReport[];
};

export function WorkspaceAdvancedFilters({
  value,
  onChange,
  reportsForOptions,
}: WorkspaceAdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const activeCount = countActiveAdvancedFilters(value);

  const options = useMemo(() => {
    const labs = new Set<string>();
    const categories = new Set<string>();
    const doctors = new Set<string>();
    const branches = new Set<string>();
    for (const r of reportsForOptions) {
      if (r.labName) labs.add(r.labName);
      if (r.category) categories.add(r.category);
      if (r.doctorName) doctors.add(r.doctorName);
      if (r.branchName) branches.add(r.branchName);
    }
    return {
      labs: [...labs].sort(),
      categories: [...categories].sort(),
      doctors: [...doctors].sort(),
      branches: [...branches].sort(),
    };
  }, [reportsForOptions]);

  const openSheet = () => {
    setDraft(value);
    setOpen(true);
  };

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const clear = () => {
    setDraft(EMPTY_ADVANCED_FILTERS);
    onChange(EMPTY_ADVANCED_FILTERS);
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" className="h-12 gap-2" onClick={openSheet}>
        <Filter className="h-4 w-4" />
        Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Advanced filters</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date-from">Date from</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-to">Date to</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
                />
              </div>
            </div>

            <FilterSelect
              label="Lab"
              value={draft.lab}
              options={options.labs}
              onChange={(lab) => setDraft({ ...draft, lab })}
            />
            <FilterSelect
              label="Category"
              value={draft.category}
              options={options.categories}
              onChange={(category) => setDraft({ ...draft, category })}
            />
            <FilterSelect
              label="Doctor"
              value={draft.doctor}
              options={options.doctors}
              onChange={(doctor) => setDraft({ ...draft, doctor })}
            />
            <FilterSelect
              label="Branch"
              value={draft.branch}
              options={options.branches}
              onChange={(branch) => setDraft({ ...draft, branch })}
            />
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draft.status || "__all__"}
                onValueChange={(v) =>
                  setDraft({
                    ...draft,
                    status: v === "__all__" ? "" : (v as ClinicalReportStatus),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {(
                    [
                      "AWAITING_REPORT",
                      "AVAILABLE",
                      "UPDATED",
                    ] as ClinicalReportStatus[]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {CLINICAL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={clear}>
              <X className="mr-1.5 h-4 w-4" />
              Clear all
            </Button>
            <Button type="button" onClick={apply}>
              Apply filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value || "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={`All ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
