"use client";

import { useEffect, useState } from "react";
import {
  getConsultationAutosaveUISnapshot,
  subscribeConsultationAutosaveUI,
  type ConsultationAutosaveUIState,
} from "@/lib/consultation-autosave";

export function ConsultationAutosaveIndicator() {
  const [state, setState] = useState<ConsultationAutosaveUIState>(() =>
    getConsultationAutosaveUISnapshot()
  );

  useEffect(() => subscribeConsultationAutosaveUI(setState), []);

  if (state.phase === "saving") {
    return (
      <span
        className="text-xs font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap"
        role="status"
      >
        Saving…
      </span>
    );
  }
  if (state.phase === "saved") {
    return (
      <span
        className="text-xs font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap"
        role="status"
      >
        Saved ✓
      </span>
    );
  }
  return null;
}
