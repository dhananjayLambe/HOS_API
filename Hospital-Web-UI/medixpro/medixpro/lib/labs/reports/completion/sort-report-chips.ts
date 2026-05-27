import { CHIP_STATUS_SORT } from "@/lib/labs/reports/completion/chip-tokens";
import type { ReportChipViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";

export function sortReportChips(reports: ReportChipViewModel[]): ReportChipViewModel[] {
  return [...reports].sort((a, b) => {
    const ai = CHIP_STATUS_SORT.indexOf(a.status);
    const bi = CHIP_STATUS_SORT.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    return a.testLabel.localeCompare(b.testLabel, undefined, { sensitivity: "base" });
  });
}
