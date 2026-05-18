"use client";

import { labSectionCardOuter, labShadowSoft, labTextMuted } from "@/components/labs/labDesignTokens";
import { cn } from "@/lib/utils";
import {
  Barcode,
  Check,
  Clock3,
  FlaskConical,
  ScanLine,
} from "lucide-react";

const FUTURE_CAPABILITIES = [
  "Barcode scanning",
  "Sample lifecycle tracking",
  "Real-time status updates",
  "Processing visibility",
  "Collection-to-report tracking",
  "Technician workflow support",
] as const;

function TrackingIllustration() {
  return (
    <div
      className="relative mx-auto flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32"
      aria-hidden
    >
      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-[#F4F1FF] to-[#EAE4FF] opacity-80 ring-1 ring-[color:rgba(124,92,252,0.12)]" />
      <div className="absolute inset-3 rounded-full border border-dashed border-[color:rgba(124,92,252,0.18)]" />
      <div className="relative flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#ECEBFF] sm:h-14 sm:w-14">
          <Barcode className="h-5 w-5 text-[#7C5CFC] sm:h-6 sm:w-6" strokeWidth={2} />
        </div>
        <div className="-ml-2 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[#ECEBFF] sm:h-14 sm:w-14">
          <FlaskConical className="h-5 w-5 text-[#9277FF] sm:h-6 sm:w-6" strokeWidth={2} />
        </div>
        <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#9277FF] text-white shadow-[0_6px_20px_rgba(124,92,252,0.35)]">
          <ScanLine className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

export function SampleTrackingComingSoon() {
  return (
    <section className={cn(labSectionCardOuter, labShadowSoft)}>
      <div className="mx-auto max-w-2xl px-6 py-12 text-center sm:px-10 sm:py-16 md:py-20">
        <TrackingIllustration />

        <p className="mt-8">
          <span className="inline-flex items-center rounded-full border border-[color:rgba(124,92,252,0.22)] bg-[#F4F1FF] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7C5CFC]">
            Coming soon
          </span>
        </p>

        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
          Sample Tracking
        </h2>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#6B7280] sm:text-base">
          We&apos;re building a powerful sample tracking experience with barcode scanning,
          real-time lifecycle updates, and end-to-end operational visibility.
        </p>

        <div
          className={cn(
            "mt-10 rounded-2xl border border-[#ECEBFF] bg-[#FAF9FF]/80 px-5 py-6 text-left sm:px-6 sm:py-7",
            labShadowSoft,
          )}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F1FF] text-[#7C5CFC] ring-1 ring-[color:rgba(124,92,252,0.1)]">
              <Clock3 className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[#111827]">Future enhancement</h3>
              <p className={cn("mt-1 text-sm leading-relaxed", labTextMuted)}>
                This feature is planned for a future release.
              </p>
              <ul className="mt-4 space-y-2.5" aria-label="Planned capabilities">
                {FUTURE_CAPABILITIES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#374151]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F4F1FF] text-[#7C5CFC]">
                      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#ECEBFF] pt-8">
          <p className="text-sm text-[#6B7280]">This module is currently under development.</p>
          <p className="mt-1 text-sm text-[#9CA3AF]">Thank you for your patience.</p>
          <p className="mt-5 text-sm font-medium text-[#7C5CFC]/80" role="note">
            Need this feature sooner? Let us know.
          </p>
        </div>
      </div>
    </section>
  );
}
