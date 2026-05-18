"use client";

import { Button } from "@/components/ui/button";
import type { ReportOperationalStatus } from "@/lib/labs/reports/report-operational-status";
import type { ReportTask } from "@/lib/labs/reports/report-task";
import { Download, Eye, MessageCircle, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";

type ReportsRowActionsProps = {
  task: ReportTask;
  onMarkReady: () => void;
  onSendWhatsApp: () => void;
  onRetry: () => void;
  onPreview: () => void;
  onViewOrder: () => void;
  actionLoading?: string | null;
};

export function ReportsRowActions({
  task,
  onMarkReady,
  onSendWhatsApp,
  onRetry,
  onPreview,
  onViewOrder,
  actionLoading,
}: ReportsRowActionsProps) {
  const loading = (key: string) => actionLoading === key;

  const btn = (
    key: string,
    label: string,
    onClick: () => void,
    icon?: React.ReactNode,
    variant: "default" | "outline" | "secondary" | "ghost" = "outline",
  ) => (
    <Button
      type="button"
      size="sm"
      variant={variant}
      className="h-7 px-2 text-[11px]"
      disabled={!!actionLoading}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
      {loading(key) ? "…" : label}
    </Button>
  );

  const wrap = (children: React.ReactNode) => (
    <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );

  switch (task.operationalStatus as ReportOperationalStatus) {
    case "PENDING_UPLOAD":
      return wrap(
        <>
          <Button type="button" size="sm" className="h-7 px-2 text-[11px]" asChild>
            <Link href={`/lab-dashboard/reports/upload?taskId=${encodeURIComponent(task.taskId)}`}>
              <Upload className="mr-1 h-3 w-3" aria-hidden />
              Upload
            </Link>
          </Button>
          {btn("view", "View order", onViewOrder, <Eye className="mr-1 h-3 w-3" aria-hidden />, "ghost")}
        </>,
      );
    case "UPLOADED":
      return wrap(
        <>
          {btn("preview", "Preview", onPreview, <Eye className="mr-1 h-3 w-3" aria-hidden />)}
          {btn("ready", "Mark ready", onMarkReady, undefined, "default")}
        </>,
      );
    case "READY_DELIVERY":
      return wrap(
        <>
          {btn("download", "Download", onPreview, <Download className="mr-1 h-3 w-3" aria-hidden />)}
          {btn("wa", "WhatsApp", onSendWhatsApp, <MessageCircle className="mr-1 h-3 w-3" aria-hidden />, "default")}
        </>,
      );
    case "DELIVERED":
      return wrap(
        <>
          {btn("view", "View", onPreview, <Eye className="mr-1 h-3 w-3" aria-hidden />)}
          {btn("resend", "Resend", onSendWhatsApp, <MessageCircle className="mr-1 h-3 w-3" aria-hidden />, "ghost")}
        </>,
      );
    case "FAILED_DELIVERY":
      return wrap(
        <>
          {btn("retry", "Retry", onRetry, <RefreshCw className="mr-1 h-3 w-3" aria-hidden />, "default")}
          {btn("view", "View", onPreview, <Eye className="mr-1 h-3 w-3" aria-hidden />, "ghost")}
        </>,
      );
    default:
      return null;
  }
}
