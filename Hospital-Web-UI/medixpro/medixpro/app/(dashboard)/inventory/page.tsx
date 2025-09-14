"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  ArrowUpDown,
  Box,
  Download,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  Truck,
} from "lucide-react"
import Link from "next/link"
import { UpdateStockModal } from "@/components/inventory/update-stock-modal"
import { PlaceOrderModal } from "@/components/inventory/place-order-modal"

// Sample data
const inventoryItems = [
  {
    id: "INV001",
    name: "Disposable Gloves (Box)",
    category: "Medical Supplies",
    stockLevel: 45,
    minLevel: 20,
    status: "In Stock",
    lastUpdated: "2023-04-15",
    supplier: "MedSupply Co.",
    location: "Storage Room A",
    unitPrice: 8.99,
  },
  {
    id: "INV002",
    name: "Ibuprofen 200mg",
    category: "Medications",
    stockLevel: 12,
    minLevel: 15,
    status: "Low Stock",
    lastUpdated: "2023-04-14",
    supplier: "PharmaDist Inc.",
    location: "Pharmacy Cabinet B",
    unitPrice: 12.5,
  },
  {
    id: "INV003",
    name: "Blood Pressure Monitor",
    category: "Equipment",
    stockLevel: 5,
    minLevel: 3,
    status: "In Stock",
    lastUpdated: "2023-04-10",
    supplier: "MedTech Solutions",
    location: "Equipment Room",
    unitPrice: 89.99,
  },
  {
    id: "INV004",
    name: "Surgical Masks (Box)",
    category: "Medical Supplies",
    stockLevel: 0,
    minLevel: 10,
    status: "Out of Stock",
    lastUpdated: "2023-04-12",
    supplier: "MedSupply Co.",
    location: "Storage Room A",
    unitPrice: 15.99,
  },
  {
    id: "INV005",
    name: "Amoxicillin 500mg",
    category: "Medications",
    stockLevel: 8,
    minLevel: 10,
    status: "Low Stock",
    lastUpdated: "2023-04-13",
    supplier: "PharmaDist Inc.",
    location: "Pharmacy Cabinet A",
    unitPrice: 22.75,
  },
  {
    id: "INV006",
    name: "Syringes 5ml",
    category: "Medical Supplies",
    stockLevel: 120,
    minLevel: 50,
    status: "In Stock",
    lastUpdated: "2023-04-11",
    supplier: "MedSupply Co.",
    location: "Storage Room B",
    unitPrice: 5.5,
  },
  {
    id: "INV007",
    name: "Examination Table Paper",
    category: "Medical Supplies",
    stockLevel: 3,
    minLevel: 5,
    status: "Low Stock",
    lastUpdated: "2023-04-09",
    supplier: "MedSupply Co.",
    location: "Storage Room A",
    unitPrice: 18.25,
  },
  {
    id: "INV008",
    name: "Digital Thermometer",
    category: "Equipment",
    stockLevel: 15,
    minLevel: 5,
    status: "In Stock",
    lastUpdated: "2023-04-08",
    supplier: "MedTech Solutions",
    location: "Equipment Room",
    unitPrice: 35.99,
  },
  {
    id: "INV009",
    name: "Alcohol Swabs (Box)",
    category: "Medical Supplies",
    stockLevel: 25,
    minLevel: 20,
    status: "On Order",
    lastUpdated: "2023-04-07",
    supplier: "MedSupply Co.",
    location: "Storage Room B",
    unitPrice: 7.25,
  },
  {
    id: "INV010",
    name: "Paracetamol 500mg",
    category: "Medications",
    stockLevel: 60,
    minLevel: 30,
    status: "In Stock",
    lastUpdated: "2023-04-06",
    supplier: "PharmaDist Inc.",
    location: "Pharmacy Cabinet C",
    unitPrice: 9.99,
  },
  {
    id: "INV011",
    name: "Stethoscope",
    category: "Equipment",
    stockLevel: 8,
    minLevel: 5,
    status: "In Stock",
    lastUpdated: "2023-04-05",
    supplier: "MedTech Solutions",
    location: "Equipment Room",
    unitPrice: 75.5,
  },
  {
    id: "INV012",
    name: "Bandages (Pack)",
    category: "Medical Supplies",
    stockLevel: 35,
    minLevel: 20,
    status: "In Stock",
    lastUpdated: "2023-04-04",
    supplier: "MedSupply Co.",
    location: "Storage Room A",
    unitPrice: 12.99,
  },
]

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockStatusFilter, setStockStatusFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("all")
  const [sortOrder, setSortOrder] = useState<{ field: string; direction: "asc" | "desc" }>({
    field: "id",
    direction: "asc",
  })
  const [filteredItems, setFilteredItems] = useState(inventoryItems)

  // Modal states
  const [selectedItem, setSelectedItem] = useState<(typeof inventoryItems)[0] | null>(null)
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState(false)
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false)

  // Apply filters and sorting
  useEffect(() => {
    let result = [...inventoryItems]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query),
      )
    }

    // Apply category filter from tabs
    if (activeTab !== "all") {
      result = result.filter((item) => item.category.toLowerCase() === activeTab.toLowerCase())
    }

    // Apply stock status filter
    if (stockStatusFilter !== "all") {
      result = result.filter((item) => item.status.toLowerCase().replace(/\s+/g, "-") === stockStatusFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      const fieldA = a[sortOrder.field as keyof typeof a]
      const fieldB = b[sortOrder.field as keyof typeof b]

      if (typeof fieldA === "string" && typeof fieldB === "string") {
        return sortOrder.direction === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA)
      } else if (typeof fieldA === "number" && typeof fieldB === "number") {
        return sortOrder.direction === "asc" ? fieldA - fieldB : fieldB - fieldA
      }
      return 0
    })

    setFilteredItems(result)
  }, [searchQuery, categoryFilter, stockStatusFilter, activeTab, sortOrder])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Handle sort
  const handleSort = (field: string) => {
    setSortOrder((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("")
    setCategoryFilter("all")
    setStockStatusFilter("all")
    setActiveTab("all")
    setSortOrder({ field: "id", direction: "asc" })
  }

  // Handle update stock
  const handleUpdateStock = (item: (typeof inventoryItems)[0]) => {
    setSelectedItem(item)
    setIsUpdateStockModalOpen(true)
  }

  // Handle place order
  const handlePlaceOrder = (item: (typeof inventoryItems)[0]) => {
    setSelectedItem(item)
    setIsPlaceOrderModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl lg:text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">Manage your clinic's inventory, supplies, and equipment</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </Link>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Items</CardTitle>
            <Box className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-3xl mb-2 font-bold">1,284</div>
            <p className="text-xs text-muted-foreground">+24 items added this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="size-8 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-3xl mb-2 font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/inventory/alerts" className="text-amber-500 hover:underline">
                View alerts
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Value of Inventory</CardTitle>
            <ShoppingCart className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-3xl mb-2 font-bold">$124,750</div>
            <p className="text-xs text-muted-foreground">+12.5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Active Suppliers</CardTitle>
            <Truck className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl xl:text-3xl mb-2 font-bold">38</div>
            <p className="text-xs text-muted-foreground">
              <Link href="/inventory/suppliers" className="hover:underline">
                View all suppliers
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full items-center flex-wrap gap-2 md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search inventory..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="medications">Medications</SelectItem>
                <SelectItem value="medical supplies">Medical Supplies</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="office">Office Supplies</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="on-order">On Order</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={resetFilters} title="Reset filters">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="medical supplies">Medical Supplies</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <InventoryTable
              items={filteredItems}
              onSort={handleSort}
              sortOrder={sortOrder}
              onUpdateStock={handleUpdateStock}
              onPlaceOrder={handlePlaceOrder}
            />
          </TabsContent>

          <TabsContent value="medications" className="mt-4">
            <InventoryTable
              items={filteredItems}
              onSort={handleSort}
              sortOrder={sortOrder}
              onUpdateStock={handleUpdateStock}
              onPlaceOrder={handlePlaceOrder}
            />
          </TabsContent>

          <TabsContent value="medical supplies" className="mt-4">
            <InventoryTable
              items={filteredItems}
              onSort={handleSort}
              sortOrder={sortOrder}
              onUpdateStock={handleUpdateStock}
              onPlaceOrder={handlePlaceOrder}
            />
          </TabsContent>

          <TabsContent value="equipment" className="mt-4">
            <InventoryTable
              items={filteredItems}
              onSort={handleSort}
              sortOrder={sortOrder}
              onUpdateStock={handleUpdateStock}
              onPlaceOrder={handlePlaceOrder}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <UpdateStockModal
        isOpen={isUpdateStockModalOpen}
        onClose={() => setIsUpdateStockModalOpen(false)}
        item={selectedItem}
      />

      <PlaceOrderModal
        isOpen={isPlaceOrderModalOpen}
        onClose={() => setIsPlaceOrderModalOpen(false)}
        item={selectedItem}
      />
    </div>
  )
}

interface InventoryTableProps {
  items: typeof inventoryItems
  onSort: (field: string) => void
  sortOrder: { field: string; direction: "asc" | "desc" }
  onUpdateStock: (item: (typeof inventoryItems)[0]) => void
  onPlaceOrder: (item: (typeof inventoryItems)[0]) => void
}

function InventoryTable({ items, onSort, sortOrder, onUpdateStock, onPlaceOrder }: InventoryTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Inventory Items</CardTitle>
        <CardDescription>
          {items.length === 0
            ? "No items found matching your filters."
            : `Showing ${items.length} item${items.length === 1 ? "" : "s"}.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Box className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No items found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <div className="flex items-center cursor-pointer" onClick={() => onSort("id")}>
                    Item ID
                    <ArrowUpDown
                      className={`ml-2 h-4 w-4 ${sortOrder.field === "id" ? "opacity-100" : "opacity-50"}`}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => onSort("name")}>
                    Name
                    <ArrowUpDown
                      className={`ml-2 h-4 w-4 ${sortOrder.field === "name" ? "opacity-100" : "opacity-50"}`}
                    />
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => onSort("stockLevel")}>
                    Stock Level
                    <ArrowUpDown
                      className={`ml-2 h-4 w-4 ${sortOrder.field === "stockLevel" ? "opacity-100" : "opacity-50"}`}
                    />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <div className="flex items-center cursor-pointer" onClick={() => onSort("lastUpdated")}>
                    Last Updated
                    <ArrowUpDown
                      className={`ml-2 h-4 w-4 ${sortOrder.field === "lastUpdated" ? "opacity-100" : "opacity-50"}`}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    {item.stockLevel} / {item.minLevel}
                  </TableCell>
                  <TableCell>
                    <StockStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>{item.lastUpdated}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/${item.id}`}>View details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/inventory/${item.id}/edit`}>Edit item</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onUpdateStock(item)}>Update stock</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPlaceOrder(item)}>Place order</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
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
