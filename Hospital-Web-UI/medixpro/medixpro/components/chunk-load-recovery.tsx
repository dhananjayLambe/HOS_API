"use client"

import { useEffect } from "react"

const STORAGE_KEY = "medixpro_chunk_load_recovery_done"

function looksLikeChunkFailure(text: string): boolean {
  const t = text.toLowerCase()
  return (
    t.includes("chunkloaderror") ||
    t.includes("loading chunk") ||
    t.includes("failed to fetch dynamically imported module") ||
    t.includes("importing a module script failed") ||
    t.includes("error loading dynamically imported module")
  )
}

/**
 * Dev-only: one automatic full reload when a Next/Webpack route chunk fails to load (common after
 * HMR or `next dev` restart). In production this component is inert so the root layout change does
 * not affect other features or user sessions.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    const tryReload = (detail: string) => {
      if (!looksLikeChunkFailure(detail)) return
      if (typeof window === "undefined") return
      if (sessionStorage.getItem(STORAGE_KEY)) return
      sessionStorage.setItem(STORAGE_KEY, "1")
      console.warn(
        "[MedixPro] Route chunk failed to load (often stale dev cache after HMR). Reloading once. If this persists, stop dev, run `rm -rf .next` and `npm run dev` again.",
      )
      window.location.reload()
    }

    const onWindowError = (e: ErrorEvent) => {
      const parts = [e.message, e.error?.message, e.error?.name].filter(Boolean) as string[]
      tryReload(parts.join(" "))

      // Only treat as chunk failure if the message matches; do not reload on every failed script
      // under `/_next/static/` (avoids false positives from unrelated script errors).
    }

    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason
      const text =
        typeof r === "string"
          ? r
          : r && typeof r === "object" && "message" in r
            ? String((r as { message?: string }).message)
            : String(r)
      tryReload(text)
    }

    window.addEventListener("error", onWindowError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onWindowError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}
