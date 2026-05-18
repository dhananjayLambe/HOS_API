"use client";

import { PricingKpiCapsule } from "@/components/labs/pricing-services/PricingKpiCapsule";
import type { PricingCatalogSummary } from "@/lib/labs/api/pricing-services-types";
import type { PricingSummaryCapsuleId } from "@/lib/labs/pricing-services/build-pricing-services-query";
import { cn } from "@/lib/utils";
import { Clock, FlaskConical, Home, Package, EyeOff, type LucideIcon } from "lucide-react";

const CAPSULE_DEFS: {
  id: PricingSummaryCapsuleId;
  key: keyof Pick<
    PricingCatalogSummary,
    "active_services" | "active_packages" | "home_collection_enabled" | "unavailable_tests"
  >;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    id: "available_tests",
    key: "active_services",
    label: "Available tests",
    hint: "Show available active services",
    icon: FlaskConical,
  },
  {
    id: "active_packages",
    key: "active_packages",
    label: "Active packages",
    hint: "Show active packages",
    icon: Package,
  },
  {
    id: "home_collection",
    key: "home_collection_enabled",
    label: "Home collection",
    hint: "Services with home collection enabled",
    icon: Home,
  },
  {
    id: "hidden_tests",
    key: "unavailable_tests",
    label: "Hidden tests",
    hint: "Hidden or unavailable services",
    icon: EyeOff,
  },
];

type Props = {
  summary: PricingCatalogSummary;
  selectedCapsule: PricingSummaryCapsuleId | null;
  onCapsuleSelect: (id: PricingSummaryCapsuleId) => void;
  className?: string;
};

export function PricingServicesSummaryCards({
  summary,
  selectedCapsule,
  onCapsuleSelect,
  className,
}: Props) {
  const avgTat =
    summary.avg_tat_hours != null ? `${Math.round(summary.avg_tat_hours)}h` : "—";

  return (
    <section className={cn("flex flex-wrap gap-2", className)} role="group" aria-label="Catalog views">
      {CAPSULE_DEFS.map(({ id, key, label, hint, icon }) => (
        <PricingKpiCapsule
          key={id}
          label={label}
          value={summary[key]}
          hint={hint}
          icon={icon}
          selected={selectedCapsule === id}
          onClick={() => onCapsuleSelect(id)}
        />
      ))}
      <PricingKpiCapsule
        label="Avg TAT"
        value={avgTat}
        hint="Available services sorted by TAT (fastest first)"
        icon={Clock}
        selected={selectedCapsule === "avg_tat"}
        onClick={() => onCapsuleSelect("avg_tat")}
      />
    </section>
  );
}
