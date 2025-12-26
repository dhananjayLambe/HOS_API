import type React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveFormGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function ResponsiveFormGrid({ children, columns = 2, className }: ResponsiveFormGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 md:grid-cols-2",
        columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  )
}
