"use client";

import { LabFilterBar } from "@/components/labs/common/LabFilterBar";
import { Button } from "@/components/ui/button";
import type { PricingCatalogTab } from "@/lib/labs/api/pricing-services-types";
import { cn } from "@/lib/utils";

// Future catalog modes:
// - Approvals
// - Sync history
// - Service areas
// - Price override requests

const CATALOG_TABS: { id: PricingCatalogTab; label: string }[] = [
  { id: "services", label: "Services" },
  { id: "packages", label: "Packages" },
];

type Props = {
  catalogTab: PricingCatalogTab;
  onCatalogTabChange: (tab: PricingCatalogTab) => void;
  disabled?: boolean;
};

export function PricingServicesTabs({ catalogTab, onCatalogTabChange, disabled }: Props) {
  return (
    <LabFilterBar className="flex-wrap gap-2">
      {CATALOG_TABS.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={catalogTab === tab.id ? "default" : "outline"}
            className={cn("h-8 text-xs")}
          disabled={disabled}
          onClick={() => onCatalogTabChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </LabFilterBar>
  );
}
