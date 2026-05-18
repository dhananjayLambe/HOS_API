"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy route — merged into Reports list (failed tab). */
export default function LabReportDeliveryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/lab-dashboard/reports/?tab=failed");
  }, [router]);

  return null;
}
