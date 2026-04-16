"use client";

export type EndConsultationReviewDataForWarnings = {
  vitals?: {
    bp?: string;
    pulse?: string;
  };
  diagnosis?: string[];
  medicines?: Array<{
    dose_display?: string;
  }>;
};

export function getWarnings(data: EndConsultationReviewDataForWarnings | null): string[] {
  if (!data) return [];
  const warnings: string[] = [];

  if (!data.medicines?.length) {
    warnings.push("No medicines added");
  }

  if (data.medicines?.some((medicine) => !String(medicine?.dose_display ?? "").trim())) {
    warnings.push("Medicine dose incomplete");
  }

  if (!data.diagnosis?.length) {
    warnings.push("No diagnosis added");
  }

  if (!String(data.vitals?.bp ?? "").trim() && !String(data.vitals?.pulse ?? "").trim()) {
    warnings.push("Vitals not recorded");
  }

  return warnings;
}

interface WarningsSectionProps {
  warnings: string[];
}

export function WarningsSection({ warnings }: WarningsSectionProps) {
  if (!warnings.length) return null;

  return (
    <div className="space-y-1.5 pt-3">
      {warnings.map((warning) => (
        <p key={warning} className="text-xs font-medium text-amber-700">
          ⚠ {warning}
        </p>
      ))}
    </div>
  );
}
