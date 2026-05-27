"use client";

import { useEffect } from "react";

export type InCardSuccessToastProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export function InCardSuccessToast({ message, onDismiss, durationMs = 3000 }: InCardSuccessToastProps) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDismiss, message]);

  return (
    <p className="text-xs font-medium text-emerald-700" role="status">
      ✅ {message}
    </p>
  );
}
