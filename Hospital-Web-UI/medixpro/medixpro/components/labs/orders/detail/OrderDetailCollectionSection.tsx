"use client";

import { ddMuted, dtClass, sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import type { LabOrderRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

export function OrderDetailCollectionSection({ order }: { order: LabOrderRow }) {
  const isHome = order.collectionType === "HOME";

  return (
    <section>
      <h3 className={sectionTitle}>Collection / visit</h3>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className={dtClass}>Type</dt>
          <dd>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isHome ? "bg-[#F3F0FF] text-[#6D4FF5]" : "bg-[#F4F1FF] text-[#374151]",
              )}
            >
              {isHome ? "Home collection" : "Lab visit"}
            </span>
          </dd>
        </div>
        <div>
          <dt className={dtClass}>Preferred slot</dt>
          <dd className={ddMuted}>{order.preferredSlot || "—"}</dd>
        </div>
        <div>
          <dt className={dtClass}>Branch</dt>
          <dd className={ddMuted}>{order.branch || "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
