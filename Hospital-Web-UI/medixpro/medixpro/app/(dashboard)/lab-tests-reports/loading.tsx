export default function LabTestsReportsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="h-11 w-full animate-pulse rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
