"use client";

import { ArrowDownAZ, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_CATEGORY_FILTER_OPTIONS,
  TEMPLATE_SORT_OPTIONS,
  type TemplateListFilters,
} from "@/lib/template-category";

interface TemplateManagementFiltersProps {
  filters: TemplateListFilters;
  onChange: (next: Partial<TemplateListFilters>) => void;
}

export function TemplateManagementFilters({
  filters,
  onChange,
}: TemplateManagementFiltersProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="template-search"
            placeholder="Search templates by name..."
            className="h-11 border-muted bg-muted/30 pl-10 text-base sm:text-sm"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Category
            </span>
            {TEMPLATE_CATEGORY_FILTER_OPTIONS.map((opt) => {
              const active = filters.category === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "h-8 rounded-full px-3.5 text-xs font-medium",
                    !active && "border-muted bg-background text-muted-foreground hover:bg-muted/60"
                  )}
                  onClick={() => onChange({ category: opt.value })}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <ArrowDownAZ className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.sort}
              onValueChange={(value) =>
                onChange({ sort: value as TemplateListFilters["sort"] })
              }
            >
              <SelectTrigger className="h-9 w-[150px] border-muted bg-background text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
