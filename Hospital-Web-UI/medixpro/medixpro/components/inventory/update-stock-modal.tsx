"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

interface UpdateStockModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    id: string
    name: string
    stockLevel: number
    minLevel: number
    status: string
  } | null
}

export function UpdateStockModal({ isOpen, onClose, item }: UpdateStockModalProps) {
  const [newStockLevel, setNewStockLevel] = useState<number | "">(item?.stockLevel || "")
  const [reason, setReason] = useState("restock")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when item changes
  useState(() => {
    if (item) {
      setNewStockLevel(item.stockLevel)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!item) return

    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      toast({
        title: "Stock Updated",
        description: `${item.name} stock level updated to ${newStockLevel}.`,
      })

      // Close the modal
      onClose()

      // Reset form
      setNewStockLevel("")
      setReason("restock")
      setNotes("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock level. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Stock Level</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-4">
              <Label htmlFor="item-name" className="text-right">
                Item
              </Label>
              <Input id="item-name" value={item.name} disabled className="col-span-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-4">
              <Label htmlFor="current-stock" className="text-right leading-tight whitespace-nowrap">
                Current Stock
              </Label>
              <Input id="current-stock" value={item.stockLevel} disabled className="col-span-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-4">
              <Label htmlFor="new-stock" className="text-right">
                New Stock
              </Label>
              <Input
                id="new-stock"
                type="number"
                value={newStockLevel}
                onChange={(e) => setNewStockLevel(e.target.value === "" ? "" : Number(e.target.value))}
                className="col-span-3"
                min={0}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-4">
              <Label htmlFor="reason" className="text-right">
                Reason
              </Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock</SelectItem>
                  <SelectItem value="adjustment">Inventory Adjustment</SelectItem>
                  <SelectItem value="damaged">Damaged/Expired</SelectItem>
                  <SelectItem value="used">Used in Procedure</SelectItem>
                  <SelectItem value="returned">Returned to Supplier</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details about this stock update"
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
