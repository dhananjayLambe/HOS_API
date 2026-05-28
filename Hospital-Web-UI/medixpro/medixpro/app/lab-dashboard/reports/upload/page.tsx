"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function UploadRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    const demo = searchParams.get("demo");
    const params = new URLSearchParams();
    if (taskId) params.set("openOrder", taskId);
    if (demo) params.set("demo", demo);
    const qs = params.toString();
    router.replace(qs ? `/lab-dashboard/reports/?${qs}` : "/lab-dashboard/reports/");
  }, [router, searchParams]);

  return <p className="p-4 text-sm text-[#6B7280]">Redirecting to reports…</p>;
}

export default function LabReportUploadRoutePage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-[#6B7280]">Redirecting…</p>}>
      <UploadRedirect />
    </Suspense>
  );
}
