"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calendar, Download, Filter, MoreHorizontal, Plus, Printer, RefreshCw, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Mock data for blood stock
const bloodStockData = [
  {
    id: "BS-001",
    bloodType: "A+",
    units: 12,
    collectionDate: "2023-04-15",
    expiryDate: "2023-05-15",
    status: "Available",
    location: "Refrigerator 1",
    donorId: "D-1045",
    donorName: "John Smith",
  },
  {
    id: "BS-002",
    bloodType: "O-",
    units: 5,
    collectionDate: "2023-04-16",
    expiryDate: "2023-05-16",
    status: "Reserved",
    location: "Refrigerator 2",
    donorId: "D-1046",
    donorName: "Emily Johnson",
  },
  {
    id: "BS-003",
    bloodType: "B+",
    units: 8,
    collectionDate: "2023-04-10",
    expiryDate: "2023-05-10",
    status: "Expiring Soon",
    location: "Refrigerator 1",
    donorId: "D-1047",
    donorName: "Michael Brown",
  },
  {
    id: "BS-004",
    bloodType: "AB+",
    units: 3,
    collectionDate: "2023-04-12",
    expiryDate: "2023-05-12",
    status: "Available",
    location: "Refrigerator 3",
    donorId: "D-1048",
    donorName: "Sarah Davis",
  },
  {
    id: "BS-005",
    bloodType: "A-",
    units: 4,
    collectionDate: "2023-04-14",
    expiryDate: "2023-05-14",
    status: "Available",
    location: "Refrigerator 2",
    donorId: "D-1049",
    donorName: "Robert Wilson",
  },
  {
    id: "BS-006",
    bloodType: "O+",
    units: 15,
    collectionDate: "2023-04-13",
    expiryDate: "2023-05-13",
    status: "Available",
    location: "Refrigerator 1",
    donorId: "D-1050",
    donorName: "Jennifer Taylor",
  },
  {
    id: "BS-007",
    bloodType: "B-",
    units: 2,
    collectionDate: "2023-04-08",
    expiryDate: "2023-05-08",
    status: "Expiring Soon",
    location: "Refrigerator 3",
    donorId: "D-1051",
    donorName: "David Martinez",
  },
  {
    id: "BS-008",
    bloodType: "AB-",
    units: 1,
    collectionDate: "2023-04-11",
    expiryDate: "2023-05-11",
    status: "Reserved",
    location: "Refrigerator 2",
    donorId: "D-1052",
    donorName: "Lisa Anderson",
  },
];

// Summary data
const summaryData = {
  totalUnits: 50,
  expiringUnits: 10,
  criticalLevels: 2,
  bloodTypeDistribution: [
    { type: "A+", units: 12 },
    { type: "A-", units: 4 },
    { type: "B+", units: 8 },
    { type: "B-", units: 2 },
    { type: "AB+", units: 3 },
    { type: "AB-", units: 1 },
    { type: "O+", units: 15 },
    { type: "O-", units: 5 },
  ],
};

export default function BloodStockPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Filter data based on active tab
  const filteredData = bloodStockData.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "available") return item.status === "Available";
    if (activeTab === "reserved") return item.status === "Reserved";
    if (activeTab === "expiring") return item.status === "Expiring Soon";
    return true;
  });

  return (
    <>
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-2">Blood Stock</h2>
          <p className="text-muted-foreground">Manage and monitor blood inventory in the blood bank</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Blood Units</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="size-8 text-red-500">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.totalUnits}</div>
              <p className="text-xs text-muted-foreground">Units available across all blood types</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blood Type Distribution</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="size-8 text-red-500">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {summaryData.bloodTypeDistribution.map((item) => (
                  <Badge key={item.type} variant={item.units < 3 ? "destructive" : "secondary"}>
                    {item.type}: {item.units}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertCircle className="size-8 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.expiringUnits}</div>
              <p className="text-xs text-muted-foreground">Units expiring within the next 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Levels</CardTitle>
              <AlertCircle className="size-8 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.criticalLevels}</div>
              <p className="text-xs text-muted-foreground">Blood types with critically low inventory</p>
            </CardContent>
          </Card>
        </div>

        {/* Blood Type Availability Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Blood Type Availability</CardTitle>
            <CardDescription>Current inventory levels for each blood type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summaryData.bloodTypeDistribution.map((item) => (
                <div key={item.type} className="flex items-center">
                  <div className="w-12 text-center font-medium">{item.type}</div>
                  <div className="flex-1 mx-4">
                    <div className="h-4 w-full rounded-full bg-secondary">
                      <div className={`h-4 rounded-full ${item.units < 3 ? "bg-destructive" : item.units < 5 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, (item.units / 20) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="w-12 text-right font-medium">{item.units} units</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters and Actions */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-wrap gap-3  md:items-center md:space-y-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search blood units..." className="w-full pl-8 md:w-[200px] lg:w-[300px]" />
            </div>

            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Blood Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="a-pos">A+</SelectItem>
                <SelectItem value="a-neg">A-</SelectItem>
                <SelectItem value="b-pos">B+</SelectItem>
                <SelectItem value="b-neg">B-</SelectItem>
                <SelectItem value="ab-pos">AB+</SelectItem>
                <SelectItem value="ab-neg">AB-</SelectItem>
                <SelectItem value="o-pos">O+</SelectItem>
                <SelectItem value="o-neg">O-</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="icon">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button asChild>
              <Link href="/blood-bank/stock/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Blood Units
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabs and Table */}
        <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Units</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="reserved">Reserved</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <div className="rounded-md border">
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm whitespace-nowrap">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium">ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Blood Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Units</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Collection Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Expiry Date</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Location</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Donor</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0 ">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <td className="p-4 align-middle font-medium">
                          <Link href={`/blood-bank/stock/${item.id}`} className="text-blue-500 hover:underline">
                            {item.id}
                          </Link>
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant="outline" className="font-bold">
                            {item.bloodType}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">{item.units}</td>
                        <td className="p-4 align-middle">{item.collectionDate}</td>
                        <td className="p-4 align-middle">{item.expiryDate}</td>
                        <td className="p-4 align-middle">
                          <Badge variant={item.status === "Available" ? "success" : item.status === "Reserved" ? "secondary" : "warning"}>{item.status}</Badge>
                        </td>
                        <td className="p-4 align-middle">{item.location}</td>
                        <td className="p-4 align-middle">
                          <Link href={`/blood-bank/donors/${item.donorId}`} className="text-blue-500 hover:underline">
                            {item.donorName}
                          </Link>
                        </td>
                        <td className="p-4 text-right align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/blood-bank/stock/${item.id}`} className="flex w-full items-center">
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/blood-bank/stock/${item.id}/update`} className="flex w-full items-center">
                                  Update Status
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="mr-2 h-4 w-4" />
                                Print Label
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-red-500">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Discard Unit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing <strong>1-8</strong> of <strong>8</strong> units
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to Discard this blood unit?</AlertDialogTitle>
            <AlertDialogDescription>Discarding a blood unit is a permanent action and cannot be undone. This action will remove the blood unit from the inventory and it will no longer be available for transfusion or other purposes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setDeleteDialogOpen(false)} className="bg-red-500 text-neutral-50 hover:bg-red-700">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
