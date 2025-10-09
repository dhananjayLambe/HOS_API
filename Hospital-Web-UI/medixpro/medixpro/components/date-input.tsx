"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface DOBInputProps {
  value: string // Expected format: YYYY-MM-DD
  onChange: (value: string) => void
  error?: string
  label?: string
  required?: boolean
  className?: string
}

export function DOBInput({
  value,
  onChange,
  error,
  label = "Date of Birth",
  required = false,
  className = "",
}: DOBInputProps) {
  // Parse the value into day, month, year
  const parseDate = (dateStr: string) => {
    if (!dateStr) return { day: "", month: "", year: "" }
    const [year, month, day] = dateStr.split("-")
    return { day: day || "", month: month || "", year: year || "" }
  }

  const [dateValues, setDateValues] = useState(parseDate(value))
  const [validationError, setValidationError] = useState("")
  const [showCalendar, setShowCalendar] = useState(false)
  const [showYearDropdown, setShowYearDropdown] = useState(false)

  const dayRef = useRef<HTMLInputElement>(null)
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  // Generate year options (1950-2005)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => (currentYear - i).toString())

  // Validate date
  const validateDate = (day: string, month: string, year: string): string => {
    if (!day || !month || !year) return ""

    const d = Number.parseInt(day)
    const m = Number.parseInt(month)
    const y = Number.parseInt(year)

    if (d < 1 || d > 31) return "Invalid day"
    if (m < 1 || m > 12) return "Invalid month"
    if (y < 1950 || y > currentYear) return "Invalid year"

    const daysInMonth = new Date(y, m, 0).getDate()
    if (d > daysInMonth) {
      return `Invalid date: ${month}/${year} has only ${daysInMonth} days`
    }

    return ""
  }

  useEffect(() => {
    const { day, month, year } = dateValues
    if (day && month && year) {
      const error = validateDate(day, month, year)
      setValidationError(error)

      if (!error) {
        const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        onChange(formattedDate)
      }
    }
  }, [dateValues])

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2)
    setDateValues((prev) => ({ ...prev, day: val }))

    if (val.length === 2) {
      monthRef.current?.focus()
    }
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2)
    setDateValues((prev) => ({ ...prev, month: val }))

    if (val.length === 2) {
      yearRef.current?.focus()
    }
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4)
    setDateValues((prev) => ({ ...prev, year: val }))
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const day = date.getDate().toString()
      const month = (date.getMonth() + 1).toString()
      const year = date.getFullYear().toString()

      setDateValues({ day, month, year })
      setShowCalendar(false)
    }
  }

  const getCalendarDate = () => {
    const { day, month, year } = dateValues
    if (day && month && year) {
      return new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
    }
    return new Date(1990, 0, 1)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && "*"}
        </Label>
      )}

      <div className="flex items-center gap-2">
        {/* Day Input */}
        <div className="flex-1">
          <Input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            placeholder="DD"
            value={dateValues.day}
            onChange={handleDayChange}
            className={`h-11 sm:h-12 text-center ${error || validationError ? "border-destructive" : ""}`}
            maxLength={2}
          />
        </div>

        <span className="text-muted-foreground">/</span>

        {/* Month Input */}
        <div className="flex-1">
          <Input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            placeholder="MM"
            value={dateValues.month}
            onChange={handleMonthChange}
            className={`h-11 sm:h-12 text-center ${error || validationError ? "border-destructive" : ""}`}
            maxLength={2}
          />
        </div>

        <span className="text-muted-foreground">/</span>

        <div className="flex-[1.5] flex gap-1">
          <Input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            placeholder="YYYY"
            value={dateValues.year}
            onChange={handleYearChange}
            className={`h-11 sm:h-12 text-center ${error || validationError ? "border-destructive" : ""}`}
            maxLength={4}
          />
          <Popover open={showYearDropdown} onOpenChange={setShowYearDropdown}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 sm:h-12 px-2 bg-transparent" type="button">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search year..." />
                <CommandList>
                  <CommandEmpty>No year found.</CommandEmpty>
                  <CommandGroup>
                    {years.map((year) => (
                      <CommandItem
                        key={year}
                        value={year}
                        onSelect={() => {
                          setDateValues((prev) => ({ ...prev, year }))
                          setShowYearDropdown(false)
                        }}
                      >
                        {year}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Calendar Picker Button */}
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11 sm:h-12 px-3 bg-transparent" type="button">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-gray-100" align="end">
            <Calendar
              mode="single"
              selected={getCalendarDate()}
              onSelect={handleCalendarSelect}
              defaultMonth={getCalendarDate()}
              fromYear={1980}
              toYear={currentYear}
              captionLayout="dropdown"
              //captionLayout="buttons"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Validation Error */}
      {validationError && (
        <p className="text-xs sm:text-sm text-destructive flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {validationError}
        </p>
      )}

      {/* External Error */}
      {error && !validationError && <p className="text-xs sm:text-sm text-destructive">{error}</p>}

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">Enter date in DD / MM / YYYY format or use the calendar picker</p>
    </div>
  )
}
