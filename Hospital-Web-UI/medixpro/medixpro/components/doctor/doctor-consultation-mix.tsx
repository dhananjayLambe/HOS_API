"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type ConsultationMix = {
  newConsultations: number;
  followUpConsultations: number;
  cancelled: number;
  noShow: number;
};

type MixRow = {
  key: keyof ConsultationMix;
  label: string;
  className?: string;
};

const MIX_ROWS: MixRow[] = [
  { key: "newConsultations", label: "New Consultations", className: "text-blue-600 dark:text-blue-400" },
  { key: "followUpConsultations", label: "Follow-Up Consultations", className: "text-amber-600 dark:text-amber-400" },
  { key: "cancelled", label: "Cancelled", className: "text-muted-foreground" },
  { key: "noShow", label: "No Show", className: "text-muted-foreground" },
];

type DoctorConsultationMixProps = {
  mix: ConsultationMix;
  loading?: boolean;
};

export function DoctorConsultationMix({ mix, loading }: DoctorConsultationMixProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Consultation Mix</CardTitle>
        <CardDescription>Breakdown of consultation types</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {MIX_ROWS.map(({ key, label, className }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            {loading ? (
              <Skeleton className="h-6 w-10" />
            ) : (
              <span className={cn("text-lg font-semibold tabular-nums", className)}>{mix[key]}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
