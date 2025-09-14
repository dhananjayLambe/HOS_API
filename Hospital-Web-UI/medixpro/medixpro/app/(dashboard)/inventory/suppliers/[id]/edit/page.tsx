"use client"

import type React from "react"

import { use, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()

  const {id} = use(params)

  // Find the supplier by ID
  const supplierData = featuredSuppliers.find((s) => s.id === id) || {
    id: id,
    name: "Unknown Supplier",
    description: "Supplier details not found",
    contactPerson: "Unknown",
    phone: "N/A",
    email: "N/A",
    location: "N/A",
    rating: 0,
    status: "Inactive",
    category: "Medical Supplies",
    website: "https://example.com",
  }

  const [supplier, setSupplier] = useState<{
    id: string
    name: string
    description: string
    contactPerson: string
    phone: string
    email: string
    location: string
    rating: number
    status: string
    category: string
    website: string
    isActive: boolean
  }>({
    ...supplierData,
    category: "Medical Supplies",
    website: "https://example.com", 
    isActive: supplierData.status === "Active",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: string, value: string | boolean) => {
    setSupplier({
      ...supplier,
      [field]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Supplier Updated",
        description: `${supplier.name} has been updated successfully.`,
      })

      // Navigate back to supplier details
      router.push(`/inventory/suppliers/${id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update supplier. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/inventory/suppliers/${id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Edit Supplier</h2>
            <p className="text-muted-foreground">Update supplier information</p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          <Save className="mr-2 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Edit the basic information about this supplier</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier-id">Supplier ID</Label>
                <Input id="supplier-id" value={supplier.id} disabled />
                <p className="text-xs text-muted-foreground">Supplier ID cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-name">Supplier Name</Label>
                <Input
                  id="supplier-name"
                  value={supplier.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={supplier.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={supplier.category} onValueChange={(value) => handleChange("category", value)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medical Supplies">Medical Supplies</SelectItem>
                    <SelectItem value="Medications">Medications</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Laboratory">Laboratory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="status"
                    checked={supplier.isActive}
                    onCheckedChange={(checked) => handleChange("isActive", checked)}
                  />
                  <Label htmlFor="status" className="cursor-pointer">
                    {supplier.isActive ? "Active" : "Inactive"}
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Edit contact details for this supplier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact-person">Contact Person</Label>
                <Input
                  id="contact-person"
                  value={supplier.contactPerson}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={supplier.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={supplier.phone} onChange={(e) => handleChange("phone", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={supplier.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={supplier.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
              <CardDescription>Configure additional supplier settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-terms">Payment Terms</Label>
                <Select defaultValue="net30">
                  <SelectTrigger id="payment-terms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net15">Net 15</SelectItem>
                    <SelectItem value="net30">Net 30</SelectItem>
                    <SelectItem value="net45">Net 45</SelectItem>
                    <SelectItem value="net60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-time">Average Lead Time (days)</Label>
                <Input id="lead-time" type="number" defaultValue="5" min="1" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min-order">Minimum Order Value ($)</Label>
                <Input id="min-order" type="number" defaultValue="100" min="0" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Select
                  value={supplier.rating.toString()}
                  onValueChange={(value) => handleChange("rating", value)}
                >
                  <SelectTrigger id="rating">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Poor</SelectItem>
                    <SelectItem value="2">2 - Below Average</SelectItem>
                    <SelectItem value="3">3 - Average</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="5">5 - Excellent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred">Preferred Supplier</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="preferred" defaultChecked={supplier.rating >= 4} />
                  <Label htmlFor="preferred" className="cursor-pointer">
                    Mark as preferred supplier
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}

// Sample data
const featuredSuppliers = [
  {
    id: "SUP001",
    name: "MedPlus Supplies",
    description: "Leading provider of high-quality medical supplies and equipment for healthcare facilities.",
    contactPerson: "Sarah Johnson",
    phone: "(555) 123-4567",
    email: "contact@medplus.com",
    location: "Chicago, IL",
    rating: 5,
    status: "Active",
  },
  {
    id: "SUP002",
    name: "PharmaTech Inc.",
    description: "Specialized pharmaceutical supplier with a wide range of medications and healthcare products.",
    contactPerson: "Michael Chen",
    phone: "(555) 987-6543",
    email: "sales@pharmatech.com",
    location: "Boston, MA",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP003",
    name: "MedEquip Solutions",
    description: "Premium medical equipment provider specializing in diagnostic and treatment devices.",
    contactPerson: "David Rodriguez",
    phone: "(555) 456-7890",
    email: "info@medequip.com",
    location: "San Diego, CA",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP006",
    name: "Global Pharma Ltd.",
    description: "International pharmaceutical supplier with extensive inventory of medications and treatments.",
    contactPerson: "Emma Wilson",
    phone: "(555) 789-0123",
    email: "sales@globalpharma.com",
    location: "New York, NY",
    rating: 5,
    status: "Active",
  },
]
