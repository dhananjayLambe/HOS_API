"use client";

import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { cn } from "@/lib/utils";

export type PricingCommercialField = {
  label: string;
  value: string;
};

type Props = {
  fields: PricingCommercialField[];
  className?: string;
};

/** Drawer-only commercial block — vertical hierarchy for price scanning. */
export function PricingCommercialSection({ fields, className }: Props) {
  return (
    <section className={cn(className)}>
      <h3 className={sectionTitle}>Commercial information</h3>
      <dl className="mt-3 space-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{label}</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-[#111827]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
