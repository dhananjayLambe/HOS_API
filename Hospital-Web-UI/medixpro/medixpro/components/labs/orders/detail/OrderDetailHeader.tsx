"use client";

import { LabOrderSlaHelper } from "@/components/labs/orders/LabOrderSlaHelper";
import { LabStatusBadge } from "@/components/labs/common/LabStatusBadge";
import { LabUrgencyBadge } from "@/components/labs/common/LabUrgencyBadge";
import { labTw } from "@/styles/lab-design-system";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { LabOrderRow } from "@/lib/labs/types";
import { cn } from "@/lib/utils";

export function OrderDetailHeader({ order }: { order: LabOrderRow }) {
  return (
    <SheetHeader className="space-y-2 border-b border-[#ECEBFF] bg-[#FAF9FF]/90 px-4 py-4 text-left backdrop-blur-sm sm:px-6">
      <div className="flex flex-wrap items-center gap-2 pr-8">
        <SheetTitle className="font-mono text-lg font-semibold tracking-tight text-[#111827]">
          {order.id}
        </SheetTitle>
        <LabStatusBadge domain="order" status={order.status} />
        <LabUrgencyBadge level={order.urgency} />
      </div>
      <p className={cn("text-base font-semibold text-[#111827]", labTw.textSecondary)}>{order.patient}</p>
      <p className="text-xs text-[#6B7280]">
        Assignment · <span className="font-medium text-[#374151]">{order.status.replace(/_/g, " ")}</span>
        <span className="mx-1.5 text-[#ECEBFF]">|</span>
        Received {order.createdAt}
      </p>
      <LabOrderSlaHelper order={order} className="mt-0.5" />
    </SheetHeader>
  );
}
