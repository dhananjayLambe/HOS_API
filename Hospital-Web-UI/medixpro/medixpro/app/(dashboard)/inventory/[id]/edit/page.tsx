"use client"
import type React from "react"
import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

// Sample data for a single inventory item
const inventoryItem = {
  id: "INV001",
  name: "Disposable Gloves (Box)",
  category: "Medical Supplies",
  stockLevel: 45,
  minLevel: 20,
  maxLevel: 100,
  status: "In Stock",
  lastUpdated: "2023-04-15",
  supplier: "MedSupply Co.",
  location: "Storage Room A",
  unitPrice: 8.99,
  description: "Powder-free latex examination gloves, size medium. Box of 100 gloves.",
  sku: "GLV-MED-100",
  expiryDate: "2024-12-31",
  batchNumber: "BN-2023-0456",
  notes: "Preferred brand for examination rooms. Order well in advance during flu season.",
  isActive: true,
}

export default function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: inventoryItem.name,
    sku: inventoryItem.sku,
    category: inventoryItem.category,
    description: inventoryItem.description,
    supplier: inventoryItem.supplier,
    location: inventoryItem.location,
    stockLevel: inventoryItem.stockLevel,
    minLevel: inventoryItem.minLevel,
    maxLevel: inventoryItem.maxLevel,
    unitPrice: inventoryItem.unitPrice,
    batchNumber: inventoryItem.batchNumber,
    notes: inventoryItem.notes,
    isActive: inventoryItem.isActive,
  })

  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    inventoryItem.expiryDate ? new Date(inventoryItem.expiryDate) : undefined,
  )

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value === "" ? "" : Number(value) }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Show success message
      toast({
        title: "Item Updated",
        description: `${formData.name} has been updated successfully.`,
      })

      // Navigate back to item details
      router.push(`/inventory/${id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl xl:text-2xl lg:text-3xl font-bold tracking-tight">Edit Item: {inventoryItem.name}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the basic details of this inventory item</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU / Item Code</Label>
                <Input id="sku" name="sku" value={formData.sku} onChange={handleInputChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleSelectChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medications">Medications</SelectItem>
                    <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supplier & Location</CardTitle>
              <CardDescription>Edit supplier and storage information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input id="supplier" name="supplier" value={formData.supplier} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Storage Location</Label>
                <Input id="location" name="location" value={formData.location} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="batchNumber">Batch Number</Label>
                <Input id="batchNumber" name="batchNumber" value={formData.batchNumber} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Information</CardTitle>
              <CardDescription>Edit stock levels and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stockLevel">Current Stock Level</Label>
                <Input
                  id="stockLevel"
                  name="stockLevel"
                  type="number"
                  value={formData.stockLevel}
                  onChange={handleNumberChange}
                  min={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minLevel">Minimum Stock Level</Label>
                <Input
                  id="minLevel"
                  name="minLevel"
                  type="number"
                  value={formData.minLevel}
                  onChange={handleNumberChange}
                  min={0}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Alert will be triggered when stock falls below this level
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLevel">Maximum Stock Level</Label>
                <Input
                  id="maxLevel"
                  name="maxLevel"
                  type="number"
                  value={formData.maxLevel}
                  onChange={handleNumberChange}
                  min={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($)</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={handleNumberChange}
                  min={0}
                  step={0.01}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Edit additional details and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} rows={4} />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Checkbox
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean)}
                />
                <Label htmlFor="isActive">Item is active and available for use</Label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
