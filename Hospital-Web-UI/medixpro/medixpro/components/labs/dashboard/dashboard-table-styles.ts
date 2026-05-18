/** Dense table overrides for dashboard pipeline panels. */
export const dashboardPipelineTableClassName =
  "rounded-none border-0 bg-transparent shadow-none " +
  "[&_th]:h-7 [&_th]:min-h-7 [&_th]:px-2 [&_th]:py-0.5 [&_th]:text-[10px] " +
  "[&_td]:h-8 [&_td]:min-h-8 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs";

/** Incoming queue — slightly taller rows for scanability; table-fixed column balance. */
export const dashboardQueueTableClassName =
  "rounded-none border-0 bg-transparent shadow-none " +
  "[&_table]:table-fixed [&_table]:w-full " +
  "[&_th]:h-9 [&_th]:min-h-9 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-[10px] " +
  "[&_td]:h-11 [&_td]:min-h-11 [&_td]:px-2 [&_td]:py-3 [&_td]:text-xs";

/** @deprecated Use dashboardQueueTableClassName or dashboardPipelineTableClassName */
export const dashboardTableClassName = dashboardPipelineTableClassName;
