"use client"

import type React from "react"

import { cn } from "@/lib/utils"

interface ShellProps {
  children: React.ReactNode
  className?: string
}

export function Shell({ children, className }: ShellProps) {
  return <div className={cn("container relative ", className)}>{children}</div>
}
