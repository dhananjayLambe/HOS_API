"use client";

import {
  PricingCatalogBadge,
  PricingExpiredChip,
  PricingHomeCollectionBadge,
  PricingMutedChip,
} from "@/components/labs/pricing-services/PricingCatalogBadge";
import { PricingCommercialSection } from "@/components/labs/pricing-services/PricingCommercialSection";
import { ddClass, ddMuted, dtClass, sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import {
  formatPricingValidFrom,
  formatPricingValidTo,
  type ServicePricingDrawerModel,
} from "@/lib/labs/pricing-services/map-pricing-rows";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ReactNode } from "react";

type Props = {
  row: ServicePricingDrawerModel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className={dtClass}>{label}</dt>
          <dd className={ddClass}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PricingServiceDetailDrawer({ row, open, onOpenChange }: Props) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden border-l border-[#ECEBFF] bg-white p-0 sm:max-w-md">
        <div className="min-h-[44px] shrink-0 border-b border-[#F3F4F6]" aria-hidden />
        <SheetHeader className="space-y-1.5 border-b border-[#ECEBFF] px-4 py-3 text-left">
          <SheetTitle className="text-lg font-semibold">{row.serviceName}</SheetTitle>
          <p className="text-sm text-[#6B7280]">{row.serviceCode}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PricingCatalogBadge label={row.displayStatus} />
            {row.isExpired ? <PricingExpiredChip /> : null}
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-4 py-4">
            <section>
              <h3 className={sectionTitle}>Operational visibility</h3>
              <DetailGrid
                items={[
                  { label: "Display status", value: row.displayStatus },
                  { label: "Catalog visibility", value: row.catalogVisibility },
                  { label: "Category", value: row.categoryName || "—" },
                ]}
              />
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <PricingCommercialSection
              fields={[
                { label: "Selling price", value: row.sellingPriceDisplay },
                { label: "Cost price", value: row.costPriceDisplay },
                { label: "Platform margin", value: row.platformMarginDisplay },
                { label: "Currency", value: row.currency },
              ]}
            />

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Fulfillment support</h3>
              <DetailGrid
                items={[
                  {
                    label: "Home collection",
                    value: <PricingHomeCollectionBadge supported={row.homeCollectionSupported} />,
                  },
                  { label: "TAT", value: <PricingMutedChip>{row.tatLabel}</PricingMutedChip> },
                ]}
              />
              {row.workflowHint ? (
                <p className={cn(ddMuted, "mt-2")}>{row.workflowHint}</p>
              ) : null}
            </section>

            <Separator className="bg-[#ECEBFF]" />

            <section>
              <h3 className={sectionTitle}>Catalog metadata</h3>
              <DetailGrid
                items={[
                  { label: "Valid from", value: formatPricingValidFrom(row.validFrom) },
                  { label: "Valid to", value: formatPricingValidTo(row.validTo) },
                  {
                    label: "Last synced",
                    value: row.lastSyncedAt
                      ? new Date(row.lastSyncedAt).toLocaleString()
                      : "—",
                  },
                  {
                    label: "Sync managed",
                    value: row.isSyncManaged ? "Yes (centralized)" : "No",
                  },
                ]}
              />
              {Object.keys(row.metadata).length > 0 ? (
                <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-[#ECEBFF] bg-[#FAF9FF]/60 p-2 text-xs text-[#374151]">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              ) : null}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
