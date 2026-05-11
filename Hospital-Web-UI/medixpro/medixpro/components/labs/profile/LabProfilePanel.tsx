import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LabProfilePanelProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function LabProfilePanel({ icon: Icon, title, description, children, className }: LabProfilePanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-[#ECEBFF] bg-white shadow-[0_4px_24px_rgba(124,92,252,0.06)]",
        className,
      )}
    >
      <div className="flex gap-3 border-b border-[#ECEBFF]/90 bg-gradient-to-r from-[#FAFAFF] to-white px-5 py-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFC]/12 text-[#5B3CC4]">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5 pt-0.5">
          <h2 className="text-base font-semibold tracking-tight text-[#111827]">{title}</h2>
          {description ? <p className="text-xs leading-relaxed text-[#6B7280]">{description}</p> : null}
        </div>
      </div>
      <div className="divide-y divide-[#F3F4F6] px-5 py-0">{children}</div>
    </section>
  );
}
