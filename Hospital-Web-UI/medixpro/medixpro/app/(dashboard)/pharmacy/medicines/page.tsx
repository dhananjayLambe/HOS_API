"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Download,
  Edit,
  Eye,
  FileText,
  MoreHorizontal,
  Package,
  PillIcon as Pills,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { UpdateStockModal } from "@/components/pharmacy/update-stock-modal"
import { ViewHistoryModal } from "@/components/pharmacy/view-history-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export default function MedicineListPage() {
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null)
  const [isUpdateStockModalOpen, setIsUpdateStockModalOpen] = useState(false)
  const [isViewHistoryModalOpen, setIsViewHistoryModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const handleUpdateStock = (medicine: any) => {
    setSelectedMedicine(medicine)
    setIsUpdateStockModalOpen(true)
  }

  const handleViewHistory = (medicine: any) => {
    setSelectedMedicine(medicine)
    setIsViewHistoryModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Medicine List</h1>
          <p className="text-muted-foreground">Manage and view all medicines in the pharmacy inventory</p>
        </div>
        <Button asChild>
          <Link href="/pharmacy/add">
            <Plus className="mr-2 h-4 w-4" />
            Add New Medicine
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Total Medicines</CardTitle>
            <Pills className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-3xl font-bold mb-2">1,248</h2>
            <p className="text-xs text-muted-foreground">+24 added this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="size-8 text-amber-500" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-3xl font-bold mb-2">42</h2>
            <p className="text-xs text-muted-foreground">Need reordering soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="size-8 text-red-500" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-3xl font-bold mb-2">18</h2>
            <p className="text-xs text-muted-foreground">Within next 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm xl:text-lg font-medium">Categories</CardTitle>
            <Package className="size-8 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <h2 className="text-2xl xl:text-3xl font-bold mb-2">36</h2>
            <p className="text-xs text-muted-foreground">Medicine categories</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search medicines..." className="w-full pl-8" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="antibiotics">Antibiotics</SelectItem>
            <SelectItem value="analgesics">Analgesics</SelectItem>
            <SelectItem value="antidiabetics">Antidiabetics</SelectItem>
            <SelectItem value="antihypertensives">Antihypertensives</SelectItem>
            <SelectItem value="antihistamines">Antihistamines</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in-stock">In Stock</SelectItem>
            <SelectItem value="low-stock">Low Stock</SelectItem>
            <SelectItem value="out-of-stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="prescription">Prescription</TabsTrigger>
          <TabsTrigger value="otc">OTC</TabsTrigger>
          <TabsTrigger value="controlled">Controlled</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="border rounded-md mt-6">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>
                  <div className="flex items-center space-x-1">
                    <span>Medicine Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicineData.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell className="font-medium">{medicine.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{medicine.name}</div>
                    <div className="text-sm text-muted-foreground">{medicine.generic}</div>
                  </TableCell>
                  <TableCell>{medicine.category}</TableCell>
                  <TableCell>{medicine.stock} units</TableCell>
                  <TableCell>{medicine.expiryDate}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        medicine.status === "In Stock"
                          ? "success"
                          : medicine.status === "Low Stock"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {medicine.status}
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
                          <Link href={`/pharmacy/medicines/${medicine.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/pharmacy/medicines/${medicine.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Medicine
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdateStock({
                              id: medicine.id,
                              name: medicine.name,
                              currentStock: medicine.stock,
                            })
                          }
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Update Stock
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleViewHistory({
                              id: medicine.id,
                              name: medicine.name,
                            })
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download Info
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="prescription" className="border rounded-md mt-6">
          <Table className="whitespace-nowrap">
            {/* Similar structure as "all" tab but filtered for prescription medicines */}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicineData
                .filter((medicine) => medicine.type === "Prescription")
                .map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{medicine.name}</div>
                      <div className="text-sm text-muted-foreground">{medicine.generic}</div>
                    </TableCell>
                    <TableCell>{medicine.category}</TableCell>
                    <TableCell>{medicine.stock} units</TableCell>
                    <TableCell>{medicine.expiryDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          medicine.status === "In Stock"
                            ? "success"
                            : medicine.status === "Low Stock"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {medicine.status}
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
                            <Link href={`/pharmacy/medicines/${medicine.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/pharmacy/medicines/${medicine.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Medicine
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStock({
                                id: medicine.id,
                                name: medicine.name,
                                currentStock: medicine.stock,
                              })
                            }
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Update Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewHistory({
                                id: medicine.id,
                                name: medicine.name,
                              })
                            }
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Info
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="otc" className="border rounded-md mt-6">
          {/* Similar structure for OTC medicines */}
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicineData
                .filter((medicine) => medicine.type === "OTC")
                .map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{medicine.name}</div>
                      <div className="text-sm text-muted-foreground">{medicine.generic}</div>
                    </TableCell>
                    <TableCell>{medicine.category}</TableCell>
                    <TableCell>{medicine.stock} units</TableCell>
                    <TableCell>{medicine.expiryDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          medicine.status === "In Stock"
                            ? "success"
                            : medicine.status === "Low Stock"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {medicine.status}
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
                            <Link href={`/pharmacy/medicines/${medicine.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/pharmacy/medicines/${medicine.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Medicine
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStock({
                                id: medicine.id,
                                name: medicine.name,
                                currentStock: medicine.stock,
                              })
                            }
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Update Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewHistory({
                                id: medicine.id,
                                name: medicine.name,
                              })
                            }
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Info
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="controlled" className="border rounded-md mt-6">
          {/* Similar structure for controlled medicines */}
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="whitespace-nowrap">
              {medicineData
                .filter((medicine) => medicine.type === "Controlled")
                .map((medicine) => (
                  <TableRow key={medicine.id}>
                    <TableCell className="font-medium">{medicine.id}</TableCell>
                    <TableCell>
                      <div className="font-medium">{medicine.name}</div>
                      <div className="text-sm text-muted-foreground">{medicine.generic}</div>
                    </TableCell>
                    <TableCell>{medicine.category}</TableCell>
                    <TableCell>{medicine.stock} units</TableCell>
                    <TableCell>{medicine.expiryDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          medicine.status === "In Stock"
                            ? "success"
                            : medicine.status === "Low Stock"
                              ? "warning"
                              : "destructive"
                        }
                      >
                        {medicine.status}
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
                            <Link href={`/pharmacy/medicines/${medicine.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/pharmacy/medicines/${medicine.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Medicine
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStock({
                                id: medicine.id,
                                name: medicine.name,
                                currentStock: medicine.stock,
                              })
                            }
                          >
                            <Upload className="mr-2 h-4 w-4" />
                            Update Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewHistory({
                                id: medicine.id,
                                name: medicine.name,
                              })
                            }
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Info
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedMedicine && (
        <>
          <UpdateStockModal
            isOpen={isUpdateStockModalOpen}
            onClose={() => setIsUpdateStockModalOpen(false)}
            medicine={selectedMedicine}
          />

          <ViewHistoryModal
            isOpen={isViewHistoryModalOpen}
            onClose={() => setIsViewHistoryModalOpen(false)}
            medicine={selectedMedicine}
          />
        </>
      )}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to Deactivate this medicine?</AlertDialogTitle>
            <AlertDialogDescription>This action will remove the doctor from active status and they will no longer be visible to patients. You can reactivate them later if needed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setIsDeleteDialogOpen(false)} className="bg-red-500 text-neutral-50 hover:bg-red-700">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Sample data for the medicine list
const medicineData = [
  {
    id: "MED001",
    name: "Amoxicillin 500mg",
    generic: "Amoxicillin",
    category: "Antibiotics",
    stock: 1250,
    expiryDate: "2025-06-15",
    status: "In Stock",
    type: "Prescription",
  },
  {
    id: "MED002",
    name: "Paracetamol 500mg",
    generic: "Acetaminophen",
    category: "Analgesics",
    stock: 3500,
    expiryDate: "2025-08-22",
    status: "In Stock",
    type: "OTC",
  },
  {
    id: "MED003",
    name: "Metformin 850mg",
    generic: "Metformin HCl",
    category: "Antidiabetics",
    stock: 850,
    expiryDate: "2024-12-10",
    status: "In Stock",
    type: "Prescription",
  },
  {
    id: "MED004",
    name: "Lisinopril 10mg",
    generic: "Lisinopril",
    category: "Antihypertensives",
    stock: 120,
    expiryDate: "2024-09-30",
    status: "Low Stock",
    type: "Prescription",
  },
  {
    id: "MED005",
    name: "Morphine 15mg",
    generic: "Morphine Sulfate",
    category: "Analgesics",
    stock: 75,
    expiryDate: "2024-11-05",
    status: "Low Stock",
    type: "Controlled",
  },
  {
    id: "MED006",
    name: "Cetirizine 10mg",
    generic: "Cetirizine HCl",
    category: "Antihistamines",
    stock: 0,
    expiryDate: "2025-03-18",
    status: "Out of Stock",
    type: "OTC",
  },
  {
    id: "MED007",
    name: "Atorvastatin 20mg",
    generic: "Atorvastatin Calcium",
    category: "Statins",
    stock: 450,
    expiryDate: "2025-01-25",
    status: "In Stock",
    type: "Prescription",
  },
  {
    id: "MED008",
    name: "Diazepam 5mg",
    generic: "Diazepam",
    category: "Anxiolytics",
    stock: 60,
    expiryDate: "2024-10-12",
    status: "Low Stock",
    type: "Controlled",
  },
  {
    id: "MED009",
    name: "Ibuprofen 400mg",
    generic: "Ibuprofen",
    category: "NSAIDs",
    stock: 2800,
    expiryDate: "2025-05-20",
    status: "In Stock",
    type: "OTC",
  },
  {
    id: "MED010",
    name: "Omeprazole 20mg",
    generic: "Omeprazole",
    category: "Proton Pump Inhibitors",
    stock: 920,
    expiryDate: "2025-02-28",
    status: "In Stock",
    type: "Prescription",
  },
]
