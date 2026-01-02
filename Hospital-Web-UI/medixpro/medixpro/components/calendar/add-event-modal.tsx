"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CalendarIcon, Clock, Bell } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

interface EventCategory {
  id: string
  name: string
  color: string
  editable?: boolean
}

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAddEvent: (event: any) => void
  categories: EventCategory[]
  selectedDate: Date
}

export function AddEventModal({ isOpen, onClose, onAddEvent, categories, selectedDate }: AddEventModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "")
  const [date, setDate] = useState<Date | undefined>(selectedDate)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [reminderTime, setReminderTime] = useState("none")
  const [timeError, setTimeError] = useState("")

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate)
      setTitle("")
      setDescription("")
      setLocation("")
      setCategoryId(categories[0]?.id || "")
      setStartTime("09:00")
      setEndTime("10:00")
      setReminderTime("none")
      setTimeError("")
    }
  }, [isOpen, selectedDate, categories])

  // Validate time
  useEffect(() => {
    if (startTime && endTime) {
      const [startHour, startMinute] = startTime.split(":").map(Number)
      const [endHour, endMinute] = endTime.split(":").map(Number)
      
      const startTotal = startHour * 60 + startMinute
      const endTotal = endHour * 60 + endMinute
      
      if (endTotal <= startTotal) {
        setTimeError("End time must be after start time")
      } else {
        setTimeError("")
      }
    }
  }, [startTime, endTime])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !date || !startTime || !endTime || !categoryId) {
      return
    }

    if (timeError) {
      return
    }

    // Create start and end date objects
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)

    const start = new Date(date)
    start.setHours(startHour, startMinute, 0, 0)

    const end = new Date(date)
    end.setHours(endHour, endMinute, 0, 0)

    // For time blocks, set a default title if not provided
    const eventTitle = categoryId === "time_block" && !title ? "Not Available" : title

    onAddEvent({
      title: eventTitle,
      description,
      location: categoryId === "time_block" ? "Blocked" : location,
      categoryId,
      start,
      end,
      reminderTime: reminderTime && reminderTime !== "none" ? reminderTime : undefined,
    })

    // Reset form
    setTitle("")
    setDescription("")
    setLocation("")
    setCategoryId(categories[0]?.id || "")
    setDate(selectedDate)
    setStartTime("09:00")
    setEndTime("10:00")
    setReminderTime("")
    setTimeError("")
  }

  // Auto-fill title for time blocks
  useEffect(() => {
    if (categoryId === "time_block" && !title) {
      setTitle("Not Available")
    }
  }, [categoryId, title])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={categoryId === "time_block" ? "Not Available" : "Enter event title"}
                required={categoryId !== "time_block"}
                disabled={categoryId === "time_block"}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center">
                        <div className={cn("w-3 h-3 rounded-full mr-2", category.color)}></div>
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startTime">Start Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endTime">End Time</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            {timeError && (
              <div className="text-sm text-red-500 dark:text-red-400">{timeError}</div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter event location"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter event description or notes"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reminderTime">Reminder Time (Optional)</Label>
              <div className="flex items-center">
                <Bell className="mr-2 h-4 w-4 text-muted-foreground" />
                <Select value={reminderTime} onValueChange={setReminderTime}>
                  <SelectTrigger id="reminderTime">
                    <SelectValue placeholder="Select reminder time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminder</SelectItem>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="10">10 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!!timeError}>
              {categoryId === "time_block" ? "Block Time" : "Add Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
