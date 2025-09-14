"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DischargePatientModalProps {
  isOpen: boolean
  onClose: () => void
  allotmentId: string
  patientName: string
  roomNumber: string
}

export default function DischargePatientModal({
  isOpen,
  onClose,
  allotmentId,
  patientName,
  roomNumber,
}: DischargePatientModalProps) {
  const [dischargeDate, setDischargeDate] = useState<Date>(new Date())
  const [dischargeTime, setDischargeTime] = useState("12:00")
  const [dischargeType, setDischargeType] = useState("regular")
  const [dischargeNotes, setDischargeNotes] = useState("")
  const [billingStatus, setBillingStatus] = useState("pending")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    setIsSubmitting(true)

    // In a real application, this would update the database
    setTimeout(() => {
      setIsSubmitting(false)
      onClose()
      // Redirect or refresh the page
      window.location.href = "/rooms/alloted"
    }, 1500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Discharge Patient</DialogTitle>
          <DialogDescription>
            Complete the discharge process for patient {patientName} from room {roomNumber}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discharge-date">Discharge Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                    id="discharge-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dischargeDate ? format(dischargeDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dischargeDate}
                    onSelect={(date) => date && setDischargeDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discharge-time">Discharge Time</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="discharge-time"
                  type="time"
                  value={dischargeTime}
                  onChange={(e) => setDischargeTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discharge-type">Discharge Type</Label>
            <Select value={dischargeType} onValueChange={setDischargeType}>
              <SelectTrigger id="discharge-type">
                <SelectValue placeholder="Select discharge type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular Discharge</SelectItem>
                <SelectItem value="against-medical-advice">Against Medical Advice</SelectItem>
                <SelectItem value="transfer">Transfer to Another Facility</SelectItem>
                <SelectItem value="deceased">Deceased</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing-status">Billing Status</Label>
            <Select value={billingStatus} onValueChange={setBillingStatus}>
              <SelectTrigger id="billing-status">
                <SelectValue placeholder="Select billing status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Payment Pending</SelectItem>
                <SelectItem value="complete">Payment Complete</SelectItem>
                <SelectItem value="insurance">Insurance Processing</SelectItem>
                <SelectItem value="waived">Charges Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="discharge-notes">Discharge Notes</Label>
            <Textarea
              id="discharge-notes"
              placeholder="Enter any notes regarding the discharge"
              value={dischargeNotes}
              onChange={(e) => setDischargeNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Confirm Discharge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
