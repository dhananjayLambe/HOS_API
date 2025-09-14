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
  ArrowLeft,
  Building,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Search,
  Star,
  Truck,
  User,
} from "lucide-react"
import Link from "next/link"
import { ContactSupplierModal } from "@/components/supplier/contact-supplier-modal"
import { PlaceOrderModal } from "@/components/supplier/place-order-modal"

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("active")
  const [activeTab, setActiveTab] = useState("all")
  const [filteredSuppliers, setFilteredSuppliers] = useState(suppliers)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)

  // Filter suppliers based on search query, category, status, and active tab
  useEffect(() => {
    let filtered = [...suppliers]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.id.toLowerCase().includes(query) ||
          supplier.category.toLowerCase().includes(query) ||
          supplier.contact.toLowerCase().includes(query),
      )
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((supplier) => supplier.category.toLowerCase() === categoryFilter.toLowerCase())
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((supplier) => supplier.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Filter by tab
    if (activeTab === "preferred") {
      filtered = filtered.filter((supplier) => supplier.rating >= 4)
    } else if (activeTab !== "all") {
      filtered = filtered.filter((supplier) => supplier.category.toLowerCase().includes(activeTab.toLowerCase()))
    }

    setFilteredSuppliers(filtered)
  }, [searchQuery, categoryFilter, statusFilter, activeTab])

  const handleContactSupplier = (supplier: any) => {
    setSelectedSupplier(supplier)
    setIsContactModalOpen(true)
  }

  const handlePlaceOrder = (supplier: any) => {
    setSelectedSupplier(supplier)
    setIsOrderModalOpen(true)
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
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">Suppliers</h2>
            <p className="text-muted-foreground">Manage your inventory suppliers and vendors</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/inventory/suppliers/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
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
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">+3 new this quarter</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Package className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">4 arriving this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Supplier</CardTitle>
            <Star className="size-8 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">MedPlus</div>
            <p className="text-xs text-muted-foreground">98% reliability rating</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <Truck className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,350</div>
            <p className="text-xs text-muted-foreground">-8% from last month</p>
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
                placeholder="Search suppliers..."
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
                <SelectItem value="office supplies">Office Supplies</SelectItem>
                <SelectItem value="laboratory">Laboratory</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Suppliers</TabsTrigger>
            <TabsTrigger value="preferred">Preferred</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="medical supplies">Medical Supplies</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Supplier Directory</CardTitle>
                <CardDescription>A comprehensive list of all your suppliers and vendors</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.id}</TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{supplier.contact}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < supplier.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                supplier.status === "Active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {supplier.status}
                            </Badge>
                          </TableCell>
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
                                  <Link href={`/inventory/suppliers/${supplier.id}`}>View details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleContactSupplier(supplier)}>
                                  Contact supplier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(supplier)}>
                                  Place order
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/inventory/suppliers/${supplier.id}/edit`}>Edit supplier</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No suppliers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="preferred" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferred Suppliers</CardTitle>
                <CardDescription>Your most reliable and frequently used suppliers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.id}</TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{supplier.contact}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < supplier.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                supplier.status === "Active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {supplier.status}
                            </Badge>
                          </TableCell>
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
                                  <Link href={`/inventory/suppliers/${supplier.id}`}>View details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleContactSupplier(supplier)}>
                                  Contact supplier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(supplier)}>
                                  Place order
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/inventory/suppliers/${supplier.id}/edit`}>Edit supplier</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No preferred suppliers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="medications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Medication Suppliers</CardTitle>
                <CardDescription>Suppliers specializing in pharmaceutical products</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.id}</TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{supplier.contact}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < supplier.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                supplier.status === "Active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {supplier.status}
                            </Badge>
                          </TableCell>
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
                                  <Link href={`/inventory/suppliers/${supplier.id}`}>View details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleContactSupplier(supplier)}>
                                  Contact supplier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(supplier)}>
                                  Place order
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/inventory/suppliers/${supplier.id}/edit`}>Edit supplier</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No medication suppliers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="medical supplies" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Medical Supplies</CardTitle>
                <CardDescription>Suppliers of medical supplies and consumables</CardDescription>
              </CardHeader>
              <CardContent>
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredSuppliers.length > 0 ? (
                      filteredSuppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.id}</TableCell>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span className="text-xs">{supplier.contact}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {Array(5)
                                .fill(null)
                                .map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < supplier.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                supplier.status === "Active"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : "bg-gray-500 hover:bg-gray-600"
                              }
                            >
                              {supplier.status}
                            </Badge>
                          </TableCell>
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
                                  <Link href={`/inventory/suppliers/${supplier.id}`}>View details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleContactSupplier(supplier)}>
                                  Contact supplier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handlePlaceOrder(supplier)}>
                                  Place order
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/inventory/suppliers/${supplier.id}/edit`}>Edit supplier</Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No medical supplies suppliers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Featured Suppliers</CardTitle>
            <CardDescription>Your top-rated and most reliable suppliers</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {featuredSuppliers.map((supplier) => (
              <div key={supplier.id} className="flex flex-col rounded-lg border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{supplier.name}</h3>
                  </div>
                  <Badge
                    className={
                      supplier.status === "Active" ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"
                    }
                  >
                    {supplier.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{supplier.description}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{supplier.location}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < supplier.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                          }`}
                        />
                      ))}
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Visit Website
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your most recent supplier orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{order.supplier}</p>
                  <p className="text-xs text-muted-foreground !mb-3">
                    Order #{order.id} • {order.date}
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      order.status === "Delivered"
                        ? "border-green-500 text-green-500"
                        : order.status === "Shipped"
                          ? "border-blue-500 text-blue-500"
                          : "border-amber-500 text-amber-500"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${order.amount}</p>
                  <p className="text-xs text-muted-foreground">{order.items} items</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Contact Supplier Modal */}
      <ContactSupplierModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        supplier={selectedSupplier}
      />

      {/* Place Order Modal */}
      <PlaceOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        supplier={selectedSupplier}
      />
    </div>
  )
}

// Sample data
const suppliers = [
  {
    id: "SUP001",
    name: "MedPlus Supplies",
    category: "Medical Supplies",
    contact: "contact@medplus.com",
    rating: 5,
    status: "Active",
  },
  {
    id: "SUP002",
    name: "PharmaTech Inc.",
    category: "Medications",
    contact: "sales@pharmatech.com",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP003",
    name: "MedEquip Solutions",
    category: "Equipment",
    contact: "info@medequip.com",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP004",
    name: "Health Supply Co.",
    category: "Medical Supplies",
    contact: "orders@healthsupply.com",
    rating: 3,
    status: "Active",
  },
  {
    id: "SUP005",
    name: "Office Depot Medical",
    category: "Office Supplies",
    contact: "medical@officedepot.com",
    rating: 4,
    status: "Active",
  },
  {
    id: "SUP006",
    name: "Global Pharma Ltd.",
    category: "Medications",
    contact: "sales@globalpharma.com",
    rating: 5,
    status: "Active",
  },
  {
    id: "SUP007",
    name: "Surgical Innovations",
    category: "Medical Supplies",
    contact: "info@surgicalinnovations.com",
    rating: 4,
    status: "Inactive",
  },
  {
    id: "SUP008",
    name: "Lab Supplies Direct",
    category: "Laboratory",
    contact: "orders@labsupplies.com",
    rating: 3,
    status: "Active",
  },
]

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

const recentOrders = [
  {
    id: "ORD4872",
    supplier: "MedPlus Supplies",
    date: "Apr 18, 2023",
    amount: "1,245.00",
    items: 12,
    status: "Delivered",
  },
  {
    id: "ORD4865",
    supplier: "PharmaTech Inc.",
    date: "Apr 15, 2023",
    amount: "876.50",
    items: 8,
    status: "Shipped",
  },
  {
    id: "ORD4861",
    supplier: "MedEquip Solutions",
    date: "Apr 12, 2023",
    amount: "2,340.75",
    items: 5,
    status: "Processing",
  },
  {
    id: "ORD4858",
    supplier: "Health Supply Co.",
    date: "Apr 10, 2023",
    amount: "567.25",
    items: 15,
    status: "Delivered",
  },
]
