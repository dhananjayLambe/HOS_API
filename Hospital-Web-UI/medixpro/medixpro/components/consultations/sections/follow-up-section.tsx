"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { useConsultationStore } from "@/store/consultationStore";
import { cn } from "@/lib/utils";

function formatFollowUpSummary(
  interval: number,
  unit: string,
  dateStr: string
): string {
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    } catch {
      // ignore
    }
  }
  if (interval > 0 && unit) {
    const isMonth = unit === "months";
    const label = isMonth
      ? interval === 1
        ? "1 Month"
        : `${interval} Months`
      : interval === 1
        ? "1 Day"
        : `${interval} Days`;
    return label;
  }
  return "";
}

export function FollowUpSection() {
  const {
    follow_up_interval,
    follow_up_unit,
    follow_up_date,
    follow_up_reason,
    setSelectedDetail,
    selectedDetail,
  } = useConsultationStore();

  const isConfigured =
    follow_up_date ||
    follow_up_interval > 0 ||
    (follow_up_reason?.trim().length ?? 0) > 0;

  const summary = useMemo(() => {
    const s = formatFollowUpSummary(
      follow_up_interval,
      follow_up_unit,
      follow_up_date
    );
    if (s) return s;
    return isConfigured ? "✓" : "";
  }, [follow_up_interval, follow_up_unit, follow_up_date, isConfigured]);

  const title = summary ? `Follow-Up • ${summary}` : "Follow-Up";
  const isSelected = selectedDetail?.section === "follow_up";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setSelectedDetail({ section: "follow_up" })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelectedDetail({ section: "follow_up" });
        }
      }}
      className={cn(
        "mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md cursor-pointer touch-manipulation",
        isSelected && "ring-2 ring-blue-500/50 ring-offset-2"
      )}
    >
      <div className="flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-1 items-center gap-2 text-left min-h-[44px]">
          <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">
            <Calendar className="text-muted-foreground" />
          </span>
          <span className="font-semibold">{title}</span>
        </div>
      </div>
    </div>
  );
}
