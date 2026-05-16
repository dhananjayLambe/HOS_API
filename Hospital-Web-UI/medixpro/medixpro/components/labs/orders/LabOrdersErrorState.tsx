"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

type LabOrdersErrorStateProps = {
  message: string;
  onRetry: () => void;
  retrying?: boolean;
};

export function LabOrdersErrorState({ message, onRetry, retrying }: LabOrdersErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-100 bg-red-50/80 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-900">Unable to load orders</p>
        <p className="max-w-md text-sm text-red-800/90">{message}</p>
      </div>
      <Button type="button" variant="outline" className="min-h-9 border-red-200 bg-white" onClick={onRetry} disabled={retrying}>
        <RotateCcw className="mr-1.5 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}
