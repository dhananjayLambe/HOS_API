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
 * One automatic full reload when a Next/Webpack route chunk fails to load (common in dev after
 * HMR or `next dev` restart while a tab still references old chunk URLs). Mounted from root layout
 * so it stays active even when a leaf route chunk fails.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
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

      const el = e.target as unknown as { tagName?: string; src?: string }
      if (el?.tagName === "SCRIPT" && typeof el.src === "string" && el.src.includes("/_next/static/")) {
        tryReload("script chunk " + el.src)
      }
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
