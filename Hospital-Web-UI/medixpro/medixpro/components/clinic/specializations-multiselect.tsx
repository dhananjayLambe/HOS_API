"use client"

import type React from "react"

import { useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  options: string[]
  placeholder?: string
}

export default function SpecializationsMultiSelect({
  value,
  onChange,
  options,
  placeholder = "Type to search or add...",
}: Props) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const normalized = (s: string) => s.trim().toLowerCase()
  const available = useMemo(() => options.filter((opt) => !value.includes(opt)), [options, value])
  const filtered = useMemo(() => {
    const q = normalized(query)
    if (!q) return available.slice(0, 6)
    return available.filter((opt) => normalized(opt).includes(q)).slice(0, 8)
  }, [available, query])

  const canCreate = query.trim().length > 0 && !options.some((o) => normalized(o) === normalized(query))

  function addItem(item: string) {
    const trimmed = item.trim()
    if (!trimmed) return
    if (value.some((v) => normalized(v) === normalized(trimmed))) return
    onChange([...value, trimmed])
    setQuery("")
    setOpen(false)
  }

  function removeItem(item: string) {
    onChange(value.filter((v) => v !== item))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (query.trim()) addItem(query)
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      // Convenience: backspace removes last chip
      onChange(value.slice(0, -1))
    }
  }

  // Close on click outside
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    // If focus moves outside wrapper, close
    if (wrapperRef.current && !wrapperRef.current.contains(e.relatedTarget as Node)) {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative" onBlur={handleBlur}>
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-2",
          "focus-within:ring-2 focus-within:ring-ring",
        )}
        onClick={() => setOpen(true)}
      >
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              className="opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                removeItem(v)
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
        />
      </div>

      {open && (
        <div
          role="listbox"
          aria-label="Specializations suggestions"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-sm"
        >
          <ul className="max-h-56 overflow-auto py-1">
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addItem(opt)}
                >
                  {opt}
                </button>
              </li>
            ))}

            {canCreate && (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm italic hover:bg-accent hover:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addItem(query)}
                >
                  Add "{query.trim()}"
                </button>
              </li>
            )}

            {!filtered.length && !canCreate && <li className="px-3 py-2 text-sm text-muted-foreground">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
