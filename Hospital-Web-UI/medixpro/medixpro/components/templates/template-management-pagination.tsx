"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TemplateManagementPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
}

const numberFormatter = new Intl.NumberFormat("en-IN");

export function TemplateManagementPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: TemplateManagementPaginationProps) {
  if (total <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-col items-center gap-2.5 border-t pt-3 sm:flex-row sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {numberFormatter.format(start)}–{numberFormatter.format(end)} of{" "}
        {numberFormatter.format(total)} templates
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <span
          className="rounded-md border bg-muted/50 px-3 py-1 text-sm font-medium"
          aria-live="polite"
        >
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
