/** Dense styles for reports list / task queue tables. */
export const reportsTableClassName =
  "rounded-none border-0 bg-transparent shadow-none " +
  "[&_th]:h-8 [&_th]:min-h-8 [&_th]:px-2 [&_th]:py-1 [&_th]:text-[10px] " +
  "[&_td]:h-9 [&_td]:min-h-9 [&_td]:px-2 [&_td]:py-1.5 [&_td]:text-xs";

export const reportsTaskRowClassName =
  "flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-xs transition-colors hover:bg-[#F8F7FF]";

export const reportsTaskRowSelectedClassName =
  "border-[color:rgba(124,92,252,0.35)] bg-[#F4F1FF] shadow-sm";
