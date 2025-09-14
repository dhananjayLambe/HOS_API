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
  ArrowLeft,
  Bell,
  Calendar,
  Clock,
  Download,
  MoreHorizontal,
  Search,
  Settings,
  ShoppingCart,
} from "lucide-react"
import Link from "next/link"
import { PlaceOrderModal } from "@/components/inventory/place-order-modal"
import { DismissAlertModal } from "@/components/inventory/dismis-alert-modal"

// Sample data for different alert types
const lowStockItems = [
  {
    id: "INV002",
    name: "Ibuprofen 200mg",
    category: "Medications",
    currentStock: 12,
    minLevel: 15,
    supplier: "PharmaTech Inc.",
    alertType: "Low Stock",
  },
  {
    id: "INV005",
    name: "Amoxicillin 500mg",
    category: "Medications",
    currentStock: 8,
    minLevel: 10,
    supplier: "MedPlus Supplies",
    alertType: "Low Stock",
  },
  {
    id: "INV007",
    name: "Examination Table Paper",
    category: "Medical Supplies",
    currentStock: 3,
    minLevel: 5,
    supplier: "Health Supply Co.",
    alertType: "Low Stock",
  },
  {
    id: "INV011",
    name: "Surgical Gloves (Medium)",
    category: "Medical Supplies",
    currentStock: 45,
    minLevel: 50,
    supplier: "MedEquip Solutions",
    alertType: "Low Stock",
  },
  {
    id: "INV015",
    name: "Bandages (Box)",
    category: "Medical Supplies",
    currentStock: 7,
    minLevel: 10,
    supplier: "Health Supply Co.",
    alertType: "Low Stock",
  },
  {
    id: "INV018",
    name: "Antiseptic Solution",
    category: "Medical Supplies",
    currentStock: 4,
    minLevel: 6,
    supplier: "MedPlus Supplies",
    alertType: "Low Stock",
  },
  {
    id: "INV023",
    name: "Syringes 10ml",
    category: "Medical Supplies",
    currentStock: 30,
    minLevel: 40,
    supplier: "MedEquip Solutions",
    alertType: "Low Stock",
  },
]

const outOfStockItems = [
  {
    id: "INV004",
    name: "Surgical Masks (Box)",
    category: "Medical Supplies",
    currentStock: 0,
    minLevel: 10,
    supplier: "MedSupply Co.",
    alertType: "Out of Stock",
  },
  {
    id: "INV019",
    name: "Lidocaine 2%",
    category: "Medications",
    currentStock: 0,
    minLevel: 8,
    supplier: "PharmaTech Inc.",
    alertType: "Out of Stock",
  },
  {
    id: "INV027",
    name: "Sterile Gauze Pads",
    category: "Medical Supplies",
    currentStock: 0,
    minLevel: 25,
    supplier: "Health Supply Co.",
    alertType: "Out of Stock",
  },
  {
    id: "INV031",
    name: "Disposable Thermometer Covers",
    category: "Medical Supplies",
    currentStock: 0,
    minLevel: 100,
    supplier: "MedEquip Solutions",
    alertType: "Out of Stock",
  },
  {
    id: "INV042",
    name: "Tongue Depressors (Box)",
    category: "Medical Supplies",
    currentStock: 0,
    minLevel: 15,
    supplier: "MedSupply Co.",
    alertType: "Out of Stock",
  },
]

const expiringItems = [
  {
    id: "INV008",
    name: "Epinephrine Injection",
    category: "Medications",
    currentStock: 12,
    minLevel: 5,
    expiryDate: "2023-05-15",
    supplier: "PharmaTech Inc.",
    alertType: "Expiring Soon",
  },
  {
    id: "INV013",
    name: "Flu Vaccines",
    category: "Medications",
    currentStock: 25,
    minLevel: 20,
    expiryDate: "2023-05-20",
    supplier: "MedPlus Supplies",
    alertType: "Expiring Soon",
  },
  {
    id: "INV021",
    name: "Insulin Vials",
    category: "Medications",
    currentStock: 8,
    minLevel: 10,
    expiryDate: "2023-05-25",
    supplier: "PharmaTech Inc.",
    alertType: "Expiring Soon",
  },
  {
    id: "INV024",
    name: "Tetanus Vaccines",
    category: "Medications",
    currentStock: 15,
    minLevel: 10,
    expiryDate: "2023-05-18",
    supplier: "MedPlus Supplies",
    alertType: "Expiring Soon",
  },
  {
    id: "INV029",
    name: "Saline Solution",
    category: "Medical Supplies",
    currentStock: 30,
    minLevel: 20,
    expiryDate: "2023-05-30",
    supplier: "Health Supply Co.",
    alertType: "Expiring Soon",
  },
  {
    id: "INV035",
    name: "Sterilization Indicators",
    category: "Medical Supplies",
    currentStock: 40,
    minLevel: 30,
    expiryDate: "2023-05-22",
    supplier: "MedEquip Solutions",
    alertType: "Expiring Soon",
  },
]

// Combine all items for the "All Alerts" tab
const allAlertItems = [...lowStockItems, ...outOfStockItems, ...expiringItems]

export default function StockAlertsPage() {
  // State for filters
  const [searchQuery, setSearchQuery] = useState("")
  const [alertTypeFilter, setAlertTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("low-stock")

  // State for modals
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false)
  const [isDismissAlertModalOpen, setIsDismissAlertModalOpen] = useState(false)

  // Filtered data for each tab
  const [filteredLowStock, setFilteredLowStock] = useState(lowStockItems)
  const [filteredOutOfStock, setFilteredOutOfStock] = useState(outOfStockItems)
  const [filteredExpiring, setFilteredExpiring] = useState(expiringItems)
  const [filteredAllAlerts, setFilteredAllAlerts] = useState(allAlertItems)

  // Apply filters
  useEffect(() => {
    // Filter low stock items
    let lowStockFiltered = [...lowStockItems]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      lowStockFiltered = lowStockFiltered.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      )
    }
    if (categoryFilter !== "all") {
      lowStockFiltered = lowStockFiltered.filter((item) => item.category.toLowerCase() === categoryFilter.toLowerCase())
    }
    setFilteredLowStock(lowStockFiltered)

    // Filter out of stock items
    let outOfStockFiltered = [...outOfStockItems]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      outOfStockFiltered = outOfStockFiltered.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      )
    }
    if (categoryFilter !== "all") {
      outOfStockFiltered = outOfStockFiltered.filter(
        (item) => item.category.toLowerCase() === categoryFilter.toLowerCase(),
      )
    }
    setFilteredOutOfStock(outOfStockFiltered)

    // Filter expiring items
    let expiringFiltered = [...expiringItems]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      expiringFiltered = expiringFiltered.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      )
    }
    if (categoryFilter !== "all") {
      expiringFiltered = expiringFiltered.filter((item) => item.category.toLowerCase() === categoryFilter.toLowerCase())
    }
    setFilteredExpiring(expiringFiltered)

    // Filter all alert items
    let allAlertsFiltered = [...allAlertItems]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      allAlertsFiltered = allAlertsFiltered.filter(
        (item) =>
          item.id.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.supplier.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      )
    }
    if (alertTypeFilter !== "all") {
      allAlertsFiltered = allAlertsFiltered.filter(
        (item) => item.alertType.toLowerCase().replace(/\s+/g, "-") === alertTypeFilter,
      )
    }
    if (categoryFilter !== "all") {
      allAlertsFiltered = allAlertsFiltered.filter(
        (item) => item.category.toLowerCase() === categoryFilter.toLowerCase(),
      )
    }
    setFilteredAllAlerts(allAlertsFiltered)
  }, [searchQuery, alertTypeFilter, categoryFilter])

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Handle place order
  const handlePlaceOrder = (item: any) => {
    setSelectedItem(item)
    setIsPlaceOrderModalOpen(true)
  }

  // Handle dismiss alert
  const handleDismissAlert = (item: any) => {
    setSelectedItem(item)
    setIsDismissAlertModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/inventory">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Stock Alerts</h2>
            <p className="text-muted-foreground">Monitor and manage inventory alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">+8 since last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockItems.length}</div>
            <p className="text-xs text-muted-foreground">+3 since last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringItems.length}</div>
            <p className="text-xs text-muted-foreground">Within next 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              <Link href="#" className="hover:underline">
                View orders
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex w-full items-center gap-2 md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search alerts..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={alertTypeFilter} onValueChange={setAlertTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Alert Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="medications">Medications</SelectItem>
                <SelectItem value="medical supplies">Medical Supplies</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="low-stock" value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
            <TabsTrigger value="all">All Alerts</TabsTrigger>
          </TabsList>

          {/* Low Stock Tab */}
          <TabsContent value="low-stock" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Low Stock Items</CardTitle>
                <CardDescription>Items that have fallen below their minimum stock level</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredLowStock.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No low stock items found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Item ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Min. Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {filteredLowStock.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.currentStock}</TableCell>
                          <TableCell>{item.minLevel}</TableCell>
                          <TableCell>
                            <Badge className="bg-amber-500 hover:bg-amber-600">Low Stock</Badge>
                          </TableCell>
                          <TableCell>{item.supplier}</TableCell>
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
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Update stock</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(item)}>Place order</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismissAlert(item)}>
                                  Dismiss alert
                                </DropdownMenuItem>
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
          </TabsContent>

          {/* Out of Stock Tab */}
          <TabsContent value="out-of-stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Out of Stock Items</CardTitle>
                <CardDescription>Items that are completely out of stock</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredOutOfStock.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No out of stock items found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Item ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Min. Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {filteredOutOfStock.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.currentStock}</TableCell>
                          <TableCell>{item.minLevel}</TableCell>
                          <TableCell>
                            <Badge className="bg-red-500 hover:bg-red-600">Out of Stock</Badge>
                          </TableCell>
                          <TableCell>{item.supplier}</TableCell>
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
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Update stock</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(item)}>Place order</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismissAlert(item)}>
                                  Dismiss alert
                                </DropdownMenuItem>
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
          </TabsContent>

          {/* Expiring Soon Tab */}
          <TabsContent value="expiring" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Expiring Soon</CardTitle>
                <CardDescription>Items that will expire within the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredExpiring.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No expiring items found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Item ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {filteredExpiring.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.currentStock}</TableCell>
                          <TableCell>{item.expiryDate}</TableCell>
                          <TableCell>
                            <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>
                          </TableCell>
                          <TableCell>{item.supplier}</TableCell>
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
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Update stock</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(item)}>Place order</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismissAlert(item)}>
                                  Dismiss alert
                                </DropdownMenuItem>
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
          </TabsContent>

          {/* All Alerts Tab */}
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>All Alerts</CardTitle>
                <CardDescription>All inventory alerts in one view</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredAllAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No alerts found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                  </div>
                ) : (
                  <Table className="whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Item ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Alert Type</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="whitespace-nowrap">
                      {filteredAllAlerts.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <AlertBadge type={item.alertType} />
                          </TableCell>
                          <TableCell>{item.currentStock}</TableCell>
                          <TableCell>{item.supplier}</TableCell>
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
                                <DropdownMenuItem>View details</DropdownMenuItem>
                                <DropdownMenuItem>Update stock</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(item)}>Place order</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDismissAlert(item)}>
                                  Dismiss alert
                                </DropdownMenuItem>
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
          </TabsContent>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Settings</CardTitle>
          <CardDescription>Configure how and when you receive inventory alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Notification Preferences</h3>
              <div className="flex items-center justify-between rounded-md border p-2 md:p-4 flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2 md:p-4 flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Alert Frequency</p>
                    <p className="text-xs text-muted-foreground">Daily summary at 9:00 AM</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Alert Thresholds</h3>
              <div className="flex items-center justify-between rounded-md border p-2 md:p-4 flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Low Stock Threshold</p>
                    <p className="text-xs text-muted-foreground">Default: 20% of minimum level</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-md border p-2 md:p-4 flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Expiry Alert Period</p>
                    <p className="text-xs text-muted-foreground">Default: 30 days before expiry</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Place Order Modal */}
      <PlaceOrderModal
        isOpen={isPlaceOrderModalOpen}
        onClose={() => setIsPlaceOrderModalOpen(false)}
        item={selectedItem}
      />

      {/* Dismiss Alert Modal */}
      <DismissAlertModal
        isOpen={isDismissAlertModalOpen}
        onClose={() => setIsDismissAlertModalOpen(false)}
        item={selectedItem}
      />
    </div>
  )
}

// Helper component for alert badges
function AlertBadge({ type }: { type: string }) {
  switch (type) {
    case "Low Stock":
      return <Badge className="bg-amber-500 hover:bg-amber-600">{type}</Badge>
    case "Out of Stock":
      return <Badge className="bg-red-500 hover:bg-red-600">{type}</Badge>
    case "Expiring Soon":
      return <Badge className="bg-orange-500 hover:bg-orange-600">{type}</Badge>
    default:
      return <Badge>{type}</Badge>
  }
}
