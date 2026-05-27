"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderLifecycleViewModel } from "@/lib/labs/reports/completion/order-lifecycle.types";
import { isPendingUpload, isReadyToSend } from "@/lib/labs/reports/completion/operational-contract";
import { useEffect, useMemo, useState } from "react";

export type SendAvailableReportsDialogProps = {
  open: boolean;
  order: OrderLifecycleViewModel | null;
  onOpenChange: (open: boolean) => void;
  onSend: (reportIds: string[]) => void;
};

export function SendAvailableReportsDialog({
  open,
  order,
  onOpenChange,
  onSend,
}: SendAvailableReportsDialogProps) {
  const ready = useMemo(
    () => order?.reports.filter(isReadyToSend) ?? [],
    [order],
  );
  const pending = useMemo(
    () => order?.reports.filter(isPendingUpload) ?? [],
    [order],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && ready.length) {
      setSelected(new Set(ready.map((r) => r.reportId)));
    }
  }, [open, ready]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Available Reports?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {ready.length > 0 ? (
            <div>
              <p className="mb-1 font-medium text-[#374151]">Ready</p>
              <ul className="space-y-1">
                {ready.map((r) => (
                  <li key={r.reportId}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(r.reportId)}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(r.reportId);
                            else next.delete(r.reportId);
                            return next;
                          });
                        }}
                      />
                      {r.testLabel}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {pending.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-900">
              <p className="font-medium">Still Pending</p>
              <p className="text-xs">Warning: {pending.map((p) => p.testLabel).join(", ")} not uploaded yet</p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSend(Array.from(selected));
              onOpenChange(false);
            }}
            disabled={selected.size === 0}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
