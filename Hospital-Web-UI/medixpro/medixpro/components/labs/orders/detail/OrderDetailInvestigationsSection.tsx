"use client";

import { sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { LabUrgencyBadge } from "@/components/labs/common/LabUrgencyBadge";
import type { LabOrderRow } from "@/lib/labs/types";

export function OrderDetailInvestigationsSection({ order }: { order: LabOrderRow }) {
  return (
    <section>
      <h3 className={sectionTitle}>Investigations</h3>
      <ul className="space-y-2">
        {order.tests.map((t) => (
          <li
            key={t.name}
            className="rounded-xl border border-[#ECEBFF] bg-[#FAF9FF]/50 px-3 py-2.5 text-sm shadow-[0_2px_8px_rgba(124,92,252,0.04)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#111827]">{t.name}</span>
              <LabUrgencyBadge level={t.urgency} />
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              Home collection: {t.homeEligible ? "Eligible" : "Not eligible"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
