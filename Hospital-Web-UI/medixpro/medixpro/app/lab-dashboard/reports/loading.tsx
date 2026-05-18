export default function ReportsLoading() {
  return (
    <div className="flex min-h-[12rem] items-center justify-center">
      <div className="h-8 w-8 animate-pulse rounded-full bg-[#E8E4FF]" aria-hidden />
      <span className="sr-only">Loading reports…</span>
    </div>
  );
}
