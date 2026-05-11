import { cn } from "@/lib/utils";

const base =
  "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1";

const tones = {
  /** Positive on / available */
  on: "bg-[#ECFDF3] text-[#027A48] ring-[#027A48]/15",
  /** Off / not available */
  off: "bg-[#F3F4F6] text-[#6B7280] ring-[#E5E7EB]",
  /** Warning — inactive, pending risk */
  warn: "bg-[#FFF7E8] text-[#B7791F] ring-[#F5C842]/25",
} as const;

export type LabBoolBadgeTone = "availability" | "activeOrders" | "yesNo" | "accountVerified";

type LabBoolBadgeProps = {
  value: boolean;
  tone?: LabBoolBadgeTone;
  /** Overrides default labels when tone is yesNo */
  trueLabel?: string;
  falseLabel?: string;
};

export function LabBoolBadge({ value, tone = "availability", trueLabel, falseLabel }: LabBoolBadgeProps) {
  if (tone === "yesNo") {
    return (
      <span className={cn(base, value ? tones.on : tones.off)}>{value ? (trueLabel ?? "Yes") : (falseLabel ?? "No")}</span>
    );
  }
  if (tone === "activeOrders") {
    return (
      <span className={cn(base, value ? tones.on : tones.warn)}>{value ? "Active" : "Inactive"}</span>
    );
  }
  if (tone === "accountVerified") {
    return (
      <span className={cn(base, value ? tones.on : tones.warn)}>{value ? "Verified" : "Pending verification"}</span>
    );
  }
  // availability-style
  return (
    <span className={cn(base, value ? tones.on : tones.off)}>{value ? "Available" : "Not available"}</span>
  );
}
