export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-md bg-muted animate-pulse" />
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
      </div>

      <div className="h-12 w-full bg-muted animate-pulse rounded mb-4" />

      <div className="h-[600px] w-full bg-muted animate-pulse rounded" />

      <div className="flex justify-end gap-4">
        <div className="h-10 w-20 bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}
