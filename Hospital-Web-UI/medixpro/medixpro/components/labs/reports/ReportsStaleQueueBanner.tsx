"use client";

type ReportsStaleQueueBannerProps = {
  visible: boolean;
};

export function ReportsStaleQueueBanner({ visible }: ReportsStaleQueueBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      Queue may be outdated. Retrying in the background — refresh if actions look wrong.
    </div>
  );
}
