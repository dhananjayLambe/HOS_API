"use client";

import { Search } from "lucide-react";

export type ReportsStickySearchProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function ReportsStickySearch({ value, onChange, disabled }: ReportsStickySearchProps) {
  return (
    <div className="sticky top-0 z-20 -mx-1 border-b border-[#E5E7EB] bg-[#FAFAFA]/95 px-1 py-1.5 shadow-sm backdrop-blur-sm">
      <label className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#9CA3AF]" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Search patient / order / phone"
          className="h-9 w-full rounded-md border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFC]"
          aria-label="Search patient, order number, or phone"
        />
      </label>
    </div>
  );
}
