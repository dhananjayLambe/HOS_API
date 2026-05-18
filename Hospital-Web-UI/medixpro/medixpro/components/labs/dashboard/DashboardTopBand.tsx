"use client";

import { labStatusCardShellCompact } from "@/components/labs/labDesignTokens";
import type { LabDashboardMetrics } from "@/hooks/labs/useLabDashboardData";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  FileText,
  Home,
  Percent,
  Send,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type ChipDef = {
  label: string;
  value: string | number;
  href: string;
  priority?: boolean;
  icon: LucideIcon;
};

type DashboardTopBandProps = {
  metrics: LabDashboardMetrics;
  loading?: boolean;
};

function formatFocusSegments(metrics: LabDashboardMetrics) {
  return [
    { n: metrics.pendingOrders, text: "pending order", plural: "pending orders" },
    { n: metrics.reportsPendingUpload, text: "report pending", plural: "reports pending" },
    { n: metrics.collectionsToday, text: "collection today", plural: "collections today" },
  ] as const;
}

function KpiChip({
  chip,
  loading,
  priority,
}: {
  chip: ChipDef;
  loading?: boolean;
  priority?: boolean;
}) {
  const Icon = chip.icon;
  return (
    <Link
      href={chip.href}
      className={cn(
        labStatusCardShellCompact,
        "items-center gap-2 no-underline transition-shadow hover:shadow-md",
        priority ? "min-w-[6.25rem] px-2.5 py-1.5" : "min-w-[4.5rem] px-2 py-1 opacity-90",
        priority && "border-[color:rgba(124,92,252,0.22)] bg-white",
      )}
    >
      <Icon
        className={cn(
          "shrink-0 stroke-[2]",
          priority ? "h-4 w-4 text-[#9CA3AF]" : "h-3.5 w-3.5 text-[#B0B7C3]",
        )}
        aria-hidden
      />
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span
          className={cn(
            "font-semibold uppercase tracking-wider text-[#9CA3AF]",
            priority ? "text-[9px]" : "text-[8px]",
          )}
        >
          {chip.label}
        </span>
        <span
          className={cn(
            "mt-1 font-bold tabular-nums text-[#111827]",
            priority ? "text-[1.75rem] leading-none sm:text-[2rem]" : "text-lg leading-none",
          )}
        >
          {loading ? "—" : chip.value}
        </span>
      </span>
    </Link>
  );
}

export function DashboardTopBand({ metrics, loading }: DashboardTopBandProps) {
  const priorityChips: ChipDef[] = [
    {
      label: "Pending",
      value: metrics.pendingOrders,
      href: "/lab-dashboard/orders/?status=PENDING",
      priority: true,
      icon: ClipboardList,
    },
    {
      label: "Reports",
      value: metrics.reportsPendingUpload,
      href: "/lab-dashboard/reports/?tab=pending",
      priority: true,
      icon: FileText,
    },
    {
      label: "Ready",
      value: metrics.readyForDelivery,
      href: "/lab-dashboard/reports/?tab=ready",
      priority: true,
      icon: Send,
    },
  ];

  const secondaryChips: ChipDef[] = [
    {
      label: "Collections",
      value: metrics.collectionsToday,
      href: "/lab-dashboard/home-collections/",
      icon: Home,
    },
    {
      label: "Orders / mo",
      value: metrics.ordersThisMonth,
      href: "/lab-dashboard/orders/",
      icon: TrendingUp,
    },
    {
      label: "Success",
      value: metrics.collectionSuccessPercent === null ? "—" : `${metrics.collectionSuccessPercent}%`,
      href: "/lab-dashboard/home-collections/",
      icon: Percent,
    },
  ];

  const segments = formatFocusSegments(metrics);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-2.5">
      <div
        className={cn(
          "flex h-9 min-h-9 max-h-11 flex-1 items-center gap-2 rounded-md border border-[#E8E6FF] bg-[#F8F7FF] px-2.5",
          "text-xs font-medium leading-tight text-[#4B5563] shadow-sm",
          loading && "animate-pulse",
        )}
        aria-live="polite"
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7C5CFC]" aria-hidden />
        {loading ? (
          <span className="text-[#9CA3AF]">Loading…</span>
        ) : (
          <span className="truncate">
            {segments.map((seg, i) => (
              <span key={seg.plural}>
                {i > 0 ? <span className="mx-1.5 text-[#C4C9D4]">•</span> : null}
                <span className="font-semibold tabular-nums text-[#111827]">{seg.n}</span>{" "}
                {seg.n === 1 ? seg.text : seg.plural}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 lg:shrink-0">
        {priorityChips.map((chip) => (
          <KpiChip key={chip.label} chip={chip} loading={loading} priority />
        ))}
        <span className="mx-0.5 hidden h-6 w-px bg-[#ECEBFF] sm:block" aria-hidden />
        {secondaryChips.map((chip) => (
          <KpiChip key={chip.label} chip={chip} loading={loading} />
        ))}
      </div>
    </div>
  );
}
