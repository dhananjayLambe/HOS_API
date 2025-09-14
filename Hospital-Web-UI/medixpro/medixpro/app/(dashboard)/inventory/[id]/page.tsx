"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Box, Calendar, Edit, FileText, MapPin, RefreshCcw, ShoppingCart, Truck, User } from "lucide-react"
import Link from "next/link"
import { UpdateStockModal } from "@/components/inventory/update-stock-modal"
import { PlaceOrderModal } from "@/components/inventory/place-order-modal"

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
}

// Sample stock history data
const stockHistory = [
  { date: "2023-04-15", action: "Stock Update", quantity: 45, previousLevel: 20, user: "Dr. Sarah Johnson" },
  { date: "2023-03-28", action: "Stock Update", quantity: 20, previousLevel: 5, user: "Nurse Mike Chen" },
  { date: "2023-03-10", action: "Stock Update", quantity: 5, previousLevel: 35, user: "Dr. Sarah Johnson" },
  { date: "2023-02-15", action: "Initial Stock", quantity: 35, previousLevel: 0, user: "Admin Lisa Wong" },
]

// Sample related items
const relatedItems = [
  { id: "INV015", name: "Disposable Gloves (Small)", category: "Medical Supplies", stockLevel: 30, minLevel: 20 },
  { id: "INV016", name: "Disposable Gloves (Large)", category: "Medical Supplies", stockLevel: 25, minLevel: 20 },
  { id: "INV022", name: "Hand Sanitizer", category: "Medical Supplies", stockLevel: 40, minLevel: 15 },
]

export default function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState(false)
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false)

  // Calculate stock percentage for progress bar
  const stockPercentage = Math.min(Math.round((inventoryItem.stockLevel / inventoryItem.maxLevel) * 100), 100)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">{inventoryItem.name}</h2>
        <Badge className="ml-2">{inventoryItem.category}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
            <CardDescription>Detailed information about this inventory item</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Basic Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item ID:</span>
                    <span>{inventoryItem.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SKU:</span>
                    <span>{inventoryItem.sku}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Category:</span>
                    <span>{inventoryItem.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <StockStatusBadge status={inventoryItem.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Updated:</span>
                    <span>{inventoryItem.lastUpdated}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Supplier & Location</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Supplier:</span>
                    <span>{inventoryItem.supplier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location:</span>
                    <span>{inventoryItem.location}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Stock Information</h3>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">Current Stock:</span>
                      <span className="font-bold">{inventoryItem.stockLevel}</span>
                    </div>
                    <Progress value={stockPercentage} className="h-2" />
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Min: {inventoryItem.minLevel}</span>
                      <span>Max: {inventoryItem.maxLevel}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Batch Number:</span>
                    <span>{inventoryItem.batchNumber}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Expiry Date:</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{inventoryItem.expiryDate}</span>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <h3 className="mb-2 text-sm font-medium text-muted-foreground">Value Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Unit Price:</span>
                    <span>${inventoryItem.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Value:</span>
                    <span className="font-bold">
                      ${(inventoryItem.stockLevel * inventoryItem.unitPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Description</h3>
              <p className="text-sm">{inventoryItem.description}</p>
            </div>

            {inventoryItem.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <h3 className="mb-2 text-sm font-medium text-muted-foreground">Notes</h3>
                  <p className="text-sm">{inventoryItem.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="justify-start" onClick={() => setIsUpdateStockModalOpen(true)}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Update Stock
            </Button>
            <Button className="justify-start" onClick={() => setIsPlaceOrderModalOpen(true)}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Place Order
            </Button>
            <Button className="justify-start" asChild>
              <Link href={`/inventory/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
              </Link>
            </Button>
            <Button className="justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock-history">Stock History</TabsTrigger>
          <TabsTrigger value="related-items">Related Items</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Item Overview</CardTitle>
              <CardDescription>Summary of this inventory item</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-medium">Item Details</h3>
                  <p className="text-sm text-muted-foreground">{inventoryItem.description}</p>
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Stock Status</h3>
                  <div className="flex items-center gap-2">
                    <StockStatusBadge status={inventoryItem.status} />
                    <span className="text-sm text-muted-foreground">{inventoryItem.stockLevel} units available</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stock-history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock History</CardTitle>
              <CardDescription>Record of stock level changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Previous Level</TableHead>
                    <TableHead>Updated By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {stockHistory.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.action}</TableCell>
                      <TableCell>{record.quantity}</TableCell>
                      <TableCell>{record.previousLevel}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {record.user}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="related-items" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Related Items</CardTitle>
              <CardDescription>Other items in the same category</CardDescription>
            </CardHeader>
            <CardContent>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="whitespace-nowrap">
                  {relatedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        {item.stockLevel} / {item.minLevel}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/inventory/${item.id}`}>
                            <Box className="mr-2 h-3.5 w-3.5" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <UpdateStockModal
        isOpen={isUpdateStockModalOpen}
        onClose={() => setIsUpdateStockModalOpen(false)}
        item={inventoryItem}
      />

      <PlaceOrderModal
        isOpen={isPlaceOrderModalOpen}
        onClose={() => setIsPlaceOrderModalOpen(false)}
        item={inventoryItem}
      />
    </div>
  )
}

function StockStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "In Stock":
      return <Badge className="bg-green-500 hover:bg-green-600">{status}</Badge>
    case "Low Stock":
      return <Badge className="bg-amber-500 hover:bg-amber-600">{status}</Badge>
    case "Out of Stock":
      return <Badge className="bg-red-500 hover:bg-red-600">{status}</Badge>
    case "On Order":
      return <Badge className="bg-blue-500 hover:bg-blue-600">{status}</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}
