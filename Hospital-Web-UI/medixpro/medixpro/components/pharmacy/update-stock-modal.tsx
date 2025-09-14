"use client"

import { useState } from "react"
import { CalendarIcon, Loader2, MinusCircle, PlusCircle } from "lucide-react"
import { format } from "date-fns"

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface UpdateStockModalProps {
  isOpen: boolean
  onClose: () => void
  medicine: {
    id: string
    name: string
    currentStock: number
  }
}

export function UpdateStockModal({ isOpen, onClose, medicine }: UpdateStockModalProps) {
  const [operation, setOperation] = useState<"add" | "subtract">("add")
  const [quantity, setQuantity] = useState<number>(0)
  const [batchNumber, setBatchNumber] = useState<string>("")
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // In a real app, you would send this data to your backend
    console.log({
      medicineId: medicine.id,
      operation,
      quantity,
      batchNumber: operation === "add" ? batchNumber : undefined,
      expiryDate: operation === "add" ? expiryDate : undefined,
      notes,
    })

    setIsSubmitting(false)
    resetForm()
    onClose()
  }

  const resetForm = () => {
    setOperation("add")
    setQuantity(0)
    setBatchNumber("")
    setExpiryDate(undefined)
    setNotes("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Stock: {medicine.name}</DialogTitle>
          <DialogDescription>Current stock: {medicine.currentStock} units</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <RadioGroup
            value={operation}
            onValueChange={(value) => setOperation(value as "add" | "subtract")}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="add" id="add" className="peer sr-only" />
              <Label
                htmlFor="add"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <PlusCircle className="mb-3 h-6 w-6" />
                Add Stock
              </Label>
            </div>

            <div>
              <RadioGroupItem value="subtract" id="subtract" className="peer sr-only" />
              <Label
                htmlFor="subtract"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <MinusCircle className="mb-3 h-6 w-6" />
                Remove Stock
              </Label>
            </div>
          </RadioGroup>

          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity || ""}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 0)}
            />
          </div>

          {operation === "add" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="batch">Batch Number</Label>
                <Input id="batch" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="expiry"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={setExpiryDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional information"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              quantity <= 0 ||
              isSubmitting ||
              (operation === "add" && !batchNumber) ||
              (operation === "add" && !expiryDate)
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Updating..." : "Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
