"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Calendar, CreditCard, Download, FileText, Filter, MoreHorizontal, Plus, Receipt, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample invoices data
const invoices = [
  {
    id: "INV-001",
    patient: {
      name: "John Smith",
      image: "/colorful-abstract-shapes.png",
      id: "P12345",
    },
    date: "2024-04-15",
    dueDate: "2024-05-15",
    amount: 250.0,
    paid: 200.0,
    balance: 50.0,
    status: "Partially Paid",
    items: [
      { description: "General Consultation", amount: 150.0 },
      { description: "Blood Test", amount: 100.0 },
    ],
    insurance: {
      provider: "Blue Cross Blue Shield",
      claimStatus: "Approved",
      claimAmount: 200.0,
    },
  },
  {
    id: "INV-002",
    patient: {
      name: "Emily Davis",
      image: "/colorful-abstract-shapes.png",
      id: "P23456",
    },
    date: "2024-04-16",
    dueDate: "2024-05-16",
    amount: 350.0,
    paid: 0.0,
    balance: 350.0,
    status: "Unpaid",
    items: [
      { description: "Specialist Consultation", amount: 200.0 },
      { description: "X-Ray", amount: 150.0 },
    ],
    insurance: {
      provider: "Aetna",
      claimStatus: "Pending",
      claimAmount: 280.0,
    },
  },
  {
    id: "INV-003",
    patient: {
      name: "Robert Wilson",
      image: "/user-3.png",
      id: "P34567",
    },
    date: "2024-04-10",
    dueDate: "2024-05-10",
    amount: 175.0,
    paid: 175.0,
    balance: 0.0,
    status: "Paid",
    items: [
      { description: "Follow-up Consultation", amount: 100.0 },
      { description: "Prescription Renewal", amount: 75.0 },
    ],
    insurance: {
      provider: "UnitedHealthcare",
      claimStatus: "Approved",
      claimAmount: 140.0,
    },
  },
  {
    id: "INV-004",
    patient: {
      name: "Jessica Brown",
      image: "/user-3.png",
      id: "P45678",
    },
    date: "2024-04-05",
    dueDate: "2024-05-05",
    amount: 520.0,
    paid: 520.0,
    balance: 0.0,
    status: "Paid",
    items: [
      { description: "Dental Cleaning", amount: 120.0 },
      { description: "Dental X-Ray", amount: 150.0 },
      { description: "Cavity Filling", amount: 250.0 },
    ],
    insurance: {
      provider: "Delta Dental",
      claimStatus: "Approved",
      claimAmount: 416.0,
    },
  },
  {
    id: "INV-005",
    patient: {
      name: "Michael Johnson",
      image: "/user-3.png",
      id: "P56789",
    },
    date: "2024-04-18",
    dueDate: "2024-05-18",
    amount: 450.0,
    paid: 0.0,
    balance: 450.0,
    status: "Unpaid",
    items: [
      { description: "Cardiology Consultation", amount: 250.0 },
      { description: "ECG", amount: 200.0 },
    ],
    insurance: {
      provider: "Cigna",
      claimStatus: "Submitted",
      claimAmount: 360.0,
    },
  },
  {
    id: "INV-006",
    patient: {
      name: "Sarah Thompson",
      image: "/user-3.png",
      id: "P67890",
    },
    date: "2024-04-12",
    dueDate: "2024-05-12",
    amount: 300.0,
    paid: 300.0,
    balance: 0.0,
    status: "Paid",
    items: [
      { description: "Physical Therapy Session", amount: 150.0 },
      { description: "Therapeutic Exercise", amount: 150.0 },
    ],
    insurance: {
      provider: "Humana",
      claimStatus: "Approved",
      claimAmount: 240.0,
    },
  },
  {
    id: "INV-007",
    patient: {
      name: "David Miller",
      image: "/user-3.png",
      id: "P78901",
    },
    date: "2024-04-20",
    dueDate: "2024-05-20",
    amount: 180.0,
    paid: 0.0,
    balance: 180.0,
    status: "Unpaid",
    items: [
      { description: "Vaccination", amount: 120.0 },
      { description: "Wellness Check", amount: 60.0 },
    ],
    insurance: {
      provider: "MedixPro",
      claimStatus: "Not Submitted",
      claimAmount: 0.0,
    },
  },
];

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter invoices based on active tab
  const getFilteredInvoices = () => {
    let filtered = [...invoices];

    // Filter by tab (status)
    if (activeTab !== "all") {
      const statusMap: Record<string, string> = {
        unpaid: "Unpaid",
        paid: "Paid",
        partial: "Partially Paid",
      };
      filtered = filtered.filter((invoice) => invoice.status === statusMap[activeTab]);
    }

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((invoice) => invoice.id.toLowerCase().includes(searchLower) || invoice.patient.name.toLowerCase().includes(searchLower) || invoice.patient.id.toLowerCase().includes(searchLower));
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    // Sort invoices
    switch (sortOption) {
      case "newest":
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "highest":
        filtered.sort((a, b) => b.amount - a.amount);
        break;
      case "lowest":
        filtered.sort((a, b) => a.amount - b.amount);
        break;
    }

    return filtered;
  };

  const filteredInvoices = getFilteredInvoices();

  // Calculate totals
  const totalOutstanding = invoices.reduce((total, invoice) => total + invoice.balance, 0);
  const unpaidCount = invoices.filter((i) => i.status === "Unpaid").length;
  const overdueCount = invoices.filter((i) => i.balance > 0 && new Date(i.dueDate) < new Date()).length;

  // Reset all filters
  const resetFilters = () => {
    setSearchText("");
    setStatusFilter("all");
  };

  // Check if any filter is active
  const isFilterActive = searchText || statusFilter !== "all";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">Manage billing and invoices for your patients.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/billing/payments">
              <Receipt className="mr-2 h-4 w-4" />
              Payments
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/billing/insurance">
              <FileText className="mr-2 h-4 w-4" />
              Insurance Claims
            </Link>
          </Button>
          <Button asChild>
            <Link href="/billing/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">All Invoices</TabsTrigger>
            <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="partial">Partially Paid</TabsTrigger>
          </TabsList>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search invoices..." className="pl-8 w-full md:w-[250px]" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              {searchText && (
                <Button variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 py-2" onClick={() => setSearchText("")}>
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear</span>
                </Button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter("all")}>All</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Paid")}>Paid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Unpaid")}>Unpaid</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("Partially Paid")}>Partially Paid</DropdownMenuItem>
                {isFilterActive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={resetFilters}>Reset Filters</DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
          </div>
        </div>

        <TabsContent value="all">
          <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>{filteredInvoices.length === invoices.length ? `Showing all ${invoices.length} invoices.` : `Showing ${filteredInvoices.length} of ${invoices.length} invoices.`}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="highest">Highest Amount</SelectItem>
                    <SelectItem value="lowest">Lowest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length > 0 ? (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Insurance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={invoice.patient.image || "/user-2.png"} alt={invoice.patient.name} />
                              <AvatarFallback>{invoice.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{invoice.patient.name}</p>
                              <p className="text-xs text-muted-foreground">{invoice.patient.id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <p>{invoice.date}</p>
                            <p className="text-xs text-muted-foreground">Due: {invoice.dueDate}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${invoice.balance.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === "Paid" ? "default" : invoice.status === "Unpaid" ? "destructive" : "outline"} className={invoice.status === "Paid" ? "bg-green-500" : invoice.status === "Unpaid" ? "bg-red-500" : "border-amber-500 text-amber-500"}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant={invoice.insurance.claimStatus === "Approved" ? "default" : invoice.insurance.claimStatus === "Pending" || invoice.insurance.claimStatus === "Submitted" ? "outline" : "secondary"}
                            className={invoice.insurance.claimStatus === "Approved" ? "bg-green-500" : invoice.insurance.claimStatus === "Pending" || invoice.insurance.claimStatus === "Submitted" ? "border-blue-500 text-blue-500" : "bg-gray-500 text-neutral-50"}
                          >
                            {invoice.insurance.claimStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/billing/${invoice.id}`}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Invoice
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Record Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Calendar className="mr-2 h-4 w-4" />
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">Void Invoice</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No invoices found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                    {isFilterActive && (
                      <Button onClick={resetFilters} variant="outline" className="mt-4">
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unpaid">
          <Card>
            <CardHeader>
              <CardTitle>Unpaid Invoices</CardTitle>
              <CardDescription>{filteredInvoices.length === unpaidCount ? `Showing all ${unpaidCount} unpaid invoices.` : `Showing ${filteredInvoices.length} of ${unpaidCount} unpaid invoices.`}</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length > 0 ? (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="hidden md:table-cell">Insurance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={invoice.patient.image || "/user-2.png"} alt={invoice.patient.name} />
                              <AvatarFallback>{invoice.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{invoice.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>{invoice.dueDate}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant={invoice.insurance.claimStatus === "Approved" ? "default" : invoice.insurance.claimStatus === "Pending" || invoice.insurance.claimStatus === "Submitted" ? "outline" : "secondary"}
                            className={invoice.insurance.claimStatus === "Approved" ? "bg-green-500" : invoice.insurance.claimStatus === "Pending" || invoice.insurance.claimStatus === "Submitted" ? "border-blue-500 text-blue-500" : "bg-gray-500"}
                          >
                            {invoice.insurance.claimStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" className="h-8">
                              <CreditCard className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Payment</span>
                            </Button>
                            <Button size="sm" variant="outline" className="h-8">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Reminder</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No unpaid invoices found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                    {isFilterActive && (
                      <Button onClick={resetFilters} variant="outline" className="mt-4">
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardHeader>
              <CardTitle>Paid Invoices</CardTitle>
              <CardDescription>View all fully paid invoices.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length > 0 ? (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="hidden md:table-cell">Payment Date</TableHead>
                      <TableHead className="hidden md:table-cell">Payment Method</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={invoice.patient.image || "/user-2.png"} alt={invoice.patient.name} />
                              <AvatarFallback>{invoice.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{invoice.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">2024-04-22</TableCell>
                        <TableCell className="hidden md:table-cell">Credit Card</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-8" asChild>
                            <Link href={`/billing/${invoice.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No paid invoices found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                    {isFilterActive && (
                      <Button onClick={resetFilters} variant="outline" className="mt-4">
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partial">
          <Card>
            <CardHeader>
              <CardTitle>Partially Paid Invoices</CardTitle>
              <CardDescription>View invoices with partial payments.</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length > 0 ? (
                <Table className="whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="whitespace-nowrap">
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={invoice.patient.image || "/user-2.png"} alt={invoice.patient.name} />
                              <AvatarFallback>{invoice.patient.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{invoice.patient.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{invoice.date}</TableCell>
                        <TableCell className="text-right">${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${invoice.paid.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${invoice.balance.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" className="h-8" asChild>
                            <Link href={`/billing/${invoice.id}`}>
                              <CreditCard className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Complete</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-lg font-semibold">No partially paid invoices found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filter criteria</p>
                    {isFilterActive && (
                      <Button onClick={resetFilters} variant="outline" className="mt-4">
                        Reset Filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {invoices.filter((i) => i.balance > 0).length} invoices</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div
                className="h-1 bg-primary"
                style={{
                  width: `${(invoices.filter((i) => i.status !== "Paid").length / invoices.length) * 100}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Paid This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,245.00</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div className="h-1 bg-green-500" style={{ width: "65%" }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overdue Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueCount}</div>
            <p className="text-xs text-muted-foreground">Total: $980.00</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div className="h-1 bg-red-500" style={{ width: "15%" }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Insurance Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Pending: $1,640.00</p>
            <div className="mt-2 h-1 w-full bg-muted">
              <div className="h-1 bg-blue-500" style={{ width: "40%" }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
