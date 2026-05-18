"use client";

import Link from "next/link";

export function DashboardFailuresFooter() {
  return (
    <p className="shrink-0 text-center text-[11px] text-[#9CA3AF] xl:text-left">
      Delivery failures →{" "}
      <Link href="/lab-dashboard/reports/?tab=failed" className="font-medium text-[#6D4FF5] hover:underline">
        Failed deliveries
      </Link>
    </p>
  );
}
