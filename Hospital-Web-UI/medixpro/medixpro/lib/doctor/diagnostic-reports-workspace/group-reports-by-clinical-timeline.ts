/**
 * Group patient reports into clinical timeline buckets for the CDS panel.
 */

export type ClinicalTimelineBucketId =
  | "today"
  | "this_week"
  | "last_month"
  | "older";

export type ClinicalTimelineBucket<T> = {
  id: ClinicalTimelineBucketId;
  label: string;
  reports: T[];
};

export type ClinicalTimelineReportLike = {
  reportDate?: string | null;
  uploadedAt?: string | null;
  collectionDate?: string | null;
};

const BUCKET_ORDER: ClinicalTimelineBucketId[] = [
  "today",
  "this_week",
  "last_month",
  "older",
];

const BUCKET_LABELS: Record<ClinicalTimelineBucketId, string> = {
  today: "Today",
  this_week: "This week",
  last_month: "Last month",
  older: "Older",
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function reportInstant(report: ClinicalTimelineReportLike): number | null {
  const raw =
    report.reportDate || report.uploadedAt || report.collectionDate || null;
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : t;
}

export function clinicalTimelineBucketForDate(
  isoOrMs: string | number | null | undefined,
  now: Date = new Date()
): ClinicalTimelineBucketId {
  if (isoOrMs == null || isoOrMs === "") return "older";
  const t = typeof isoOrMs === "number" ? isoOrMs : Date.parse(String(isoOrMs));
  if (Number.isNaN(t)) return "older";

  const day = startOfLocalDay(new Date(t)).getTime();
  const today = startOfLocalDay(now).getTime();
  const dayMs = 86_400_000;

  if (day === today) return "today";
  if (day > today - 7 * dayMs && day < today) return "this_week";
  if (day > today - 30 * dayMs && day <= today - 7 * dayMs) return "last_month";
  return "older";
}

/**
 * Groups reports into Today / This week / Last month / Older.
 * Within each bucket, newest first. Empty buckets are omitted.
 */
export function groupReportsByClinicalTimeline<T extends ClinicalTimelineReportLike>(
  reports: T[],
  now: Date = new Date()
): ClinicalTimelineBucket<T>[] {
  const sorted = [...reports].sort((a, b) => {
    const ta = reportInstant(a) ?? 0;
    const tb = reportInstant(b) ?? 0;
    return tb - ta;
  });

  const buckets = new Map<ClinicalTimelineBucketId, T[]>(
    BUCKET_ORDER.map((id) => [id, []])
  );

  for (const report of sorted) {
    const instant = reportInstant(report);
    const id = clinicalTimelineBucketForDate(instant, now);
    buckets.get(id)!.push(report);
  }

  return BUCKET_ORDER.filter((id) => (buckets.get(id)?.length ?? 0) > 0).map(
    (id) => ({
      id,
      label: BUCKET_LABELS[id],
      reports: buckets.get(id)!,
    })
  );
}
