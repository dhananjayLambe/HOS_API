"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DateRangePickerProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
}

function DateRangePickerComponent({ className, value, onChange }: DateRangePickerProps) {
  const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  })
  const date = value ?? internalDate

  const handleSelect = (nextRange: DateRange | undefined) => {
    if (onChange) {
      onChange(nextRange)
      return
    }
    setInternalDate(nextRange)
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

// Export with both names to support all imports
export const DateRangePicker = DateRangePickerComponent
export const CalendarDateRangePicker = DateRangePickerComponent
