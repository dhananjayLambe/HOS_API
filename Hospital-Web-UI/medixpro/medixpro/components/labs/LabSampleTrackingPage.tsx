"use client";

import { SampleTrackingComingSoon } from "@/components/labs/sample-tracking/SampleTrackingComingSoon";
import { useLabShellHeader } from "@/lib/labs/layout/lab-shell-header-context";
import { useLabSession } from "@/lib/labs/session/lab-session-context";

export function LabSampleTrackingPage() {
  const { data: session } = useLabSession();
  const branchLabel = session?.branch?.branch_name ?? "";

  useLabShellHeader({
    title: "Sample Tracking",
    description: branchLabel
      ? `${branchLabel} — track sample collection, receipt, processing, and delivery workflows.`
      : "Track sample collection, receipt, processing, and delivery workflows.",
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <SampleTrackingComingSoon />
    </div>
  );
}
