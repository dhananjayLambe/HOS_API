import { Badge } from "@/components/ui/badge";
import type { ClinicalReportStatus } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { CLINICAL_STATUS_LABELS } from "@/components/doctor/diagnostic-reports-workspace/workspace-types";
import { clinicalStatusBadgeClasses } from "@/lib/design-system/clinical";
import { cn } from "@/lib/utils";

type ClinicalStatusBadgeProps = {
  status: ClinicalReportStatus;
  className?: string;
  label?: string;
};

export function ClinicalStatusBadge({
  status,
  className,
  label,
}: ClinicalStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 text-[10px] font-semibold",
        clinicalStatusBadgeClasses(status),
        className
      )}
    >
      {label ?? CLINICAL_STATUS_LABELS[status]}
    </Badge>
  );
}
