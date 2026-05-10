"use client";

import { labLavenderBorder, labShadowSoft } from "@/components/labs/labDesignTokens";
import { labMotion, labRadii } from "@/styles/lab-design-system";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type LabDataTableProps = {
  children: ReactNode;
  /** When set, wrapper scrolls vertically so sticky table headers stay visible inside the scroll region. */
  maxHeightClass?: string;
  className?: string;
};

/**
 * Lab premium operational table: 28px shell, lavender header band, tall rows, calm hover.
 */
export function LabDataTable({ children, maxHeightClass, className }: LabDataTableProps) {
  return (
    <div
      className={cn(
        labRadii.section,
        "overflow-x-auto overflow-y-auto border bg-white " + labLavenderBorder + " " + labShadowSoft,
        maxHeightClass,
        "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:border-b [&_thead]:border-[#ECEBFF] [&_thead]:bg-[#F6F4FF]",
        "[&_thead_tr]:border-0 [&_thead_tr]:shadow-none",
        "[&_th]:h-16 [&_th]:min-h-16 [&_th]:border-x-0 [&_th]:px-4 [&_th]:py-0 [&_th]:text-left [&_th]:align-middle [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-[#6B7280]",
        "[&_td]:h-16 [&_td]:min-h-16 [&_td]:border-x-0 [&_td]:px-4 [&_td]:py-0 [&_td]:align-middle [&_td]:text-sm [&_td]:text-[#374151]",
        "[&_tbody>tr]:border-b [&_tbody>tr]:border-[#ECEBFF]/80 " + labMotion.tableRow,
        "[&_tbody>tr:hover]:bg-[#FAF9FF]",
        "[&>div]:overflow-visible",
        className
      )}
    >
      {children}
    </div>
  );
}
