import type { DeliveryFailure } from "@/lib/labs/reports/completion/order-lifecycle.types";

export type DeliveryFailureInlineProps = {
  failure: DeliveryFailure;
};

export function DeliveryFailureInline({ failure }: DeliveryFailureInlineProps) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
      <span className="font-semibold">Delivery failed</span>
      <span> - {failure.reason}</span>
    </div>
  );
}
