"use client";

import { ddClass, ddMuted, dtClass, sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import { Button } from "@/components/ui/button";
import type { LabOrderRow } from "@/lib/labs/types";
import { ExternalLink } from "lucide-react";

export function OrderDetailDoctorSection({ order }: { order: LabOrderRow }) {
  return (
    <section>
      <h3 className={sectionTitle}>Doctor</h3>
      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={dtClass}>Name</dt>
          <dd className={ddClass}>{order.doctor || "—"}</dd>
        </div>
        <div>
          <dt className={dtClass}>Clinic</dt>
          <dd className={ddMuted}>{order.clinic || "—"}</dd>
        </div>
        {order.prescriptionUrl ? (
          <div className="sm:col-span-2">
            <dt className={dtClass}>Prescription</dt>
            <dd>
              <Button variant="link" className="h-auto p-0 text-[#7C5CFC]" asChild>
                <a href={order.prescriptionUrl} target="_blank" rel="noopener noreferrer">
                  Open link <ExternalLink className="ml-1 inline h-3 w-3" />
                </a>
              </Button>
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
