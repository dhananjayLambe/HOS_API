"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Building } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface PlaceOrderModalProps {
  isOpen: boolean
  onClose: () => void
  supplier: {
    id: string
    name: string
  } | null
}

export function PlaceOrderModal({ isOpen, onClose, supplier }: PlaceOrderModalProps) {
  const [items, setItems] = useState([{ id: 1, name: "", quantity: 1, unitPrice: "", total: "" }])
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
  )
  const [priority, setPriority] = useState("normal")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!supplier) return null

  const addItem = () => {
    setItems([...items, { id: items.length + 1, name: "", quantity: 1, unitPrice: "", total: "" }])
  }

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: number, field: string, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }

          // Calculate total if both quantity and unitPrice are set
          if (field === "quantity" || field === "unitPrice") {
            const quantity = field === "quantity" ? Number(value) : Number(item.quantity)
            const unitPrice = field === "unitPrice" ? value : item.unitPrice

            if (quantity && unitPrice) {
              updatedItem.total = (quantity * Number(unitPrice)).toFixed(2)
            }
          }

          return updatedItem
        }
        return item
      }),
    )
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      toast({
        title: "Order Placed",
        description: `Your order has been placed with ${supplier.name}.`,
      })

      // Close the modal
      onClose()

      // Reset form
      setItems([{ id: 1, name: "", quantity: 1, unitPrice: "", total: "" }])
      setPriority("normal")
      setNotes("")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Place Order with {supplier.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">{supplier.name}</h3>
            </div>

            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-3">Order Items</h4>

              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="text"
                      placeholder="Unit price"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <Input type="text" placeholder="Total" value={item.total} disabled />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length === 1}
                    >
                      &times;
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between mt-4">
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  Add Item
                </Button>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">${calculateTotal()}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery-date" className="block mb-2">
                  Expected Delivery
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deliveryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={deliveryDate}
                      onSelect={setDeliveryDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="priority" className="block mb-2">
                  Priority
                </Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="block mb-2">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions for this order"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Placing Order..." : "Place Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
