"use client";

import { ddClass, ddMuted, dtClass, sectionTitle } from "@/components/labs/orders/detail/detail-styles";
import type { LabOrderRow } from "@/lib/labs/types";

export function OrderDetailPatientSection({ order }: { order: LabOrderRow }) {
  const showAddress = order.collectionType === "HOME" && order.patientAddress.trim().length > 0;

  return (
    <section>
      <h3 className={sectionTitle}>Patient</h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={dtClass}>Name</dt>
          <dd className={ddClass}>{order.patient}</dd>
        </div>
        <div>
          <dt className={dtClass}>Age / gender</dt>
          <dd className={ddMuted}>
            {order.patientAge || "—"} / {order.patientGender || "—"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className={dtClass}>Phone</dt>
          <dd className={ddMuted}>
            {order.patientPhone ? (
              <span
                className="cursor-not-allowed text-[#374151]"
                title="Calling is not available in this release"
              >
                {order.patientPhone}
              </span>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {showAddress ? (
          <div className="sm:col-span-2">
            <dt className={dtClass}>Collection address</dt>
            <dd className={ddMuted}>{order.patientAddress}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
