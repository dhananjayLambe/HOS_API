import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  APPROVED: "success",
  PENDING: "warning",
  UNDER_REVIEW: "warning",
  REJECTED: "danger",
  SUSPENDED: "danger",
  BLOCKED: "danger",
  INACTIVE: "neutral",
};

const toneClass: Record<string, string> = {
  success: "bg-[#ECFDF3] text-[#027A48] ring-1 ring-[#027A48]/15",
  warning: "bg-[#FFF7E8] text-[#B7791F] ring-1 ring-[#B7791F]/18",
  danger: "bg-[#FEF3F2] text-[#B42318] ring-1 ring-[#B42318]/12",
  neutral: "bg-[#F4F1FF] text-[#6B7280] ring-1 ring-[#ECEBFF]",
};

function humanizeStatus(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function LabRegistrationPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
        toneClass[tone],
      )}
    >
      {humanizeStatus(status)}
    </span>
  );
}
